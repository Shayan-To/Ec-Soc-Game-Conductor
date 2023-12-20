import { type Prisma } from "@prisma/client";
import { type GetFindResult } from "@prisma/client/runtime/library";
import { type Session } from "next-auth";
import random from "random";
import { assets, exchangeActions, type Asset } from "~/base/entities";
import { capitalize, createObjectFromEntries } from "~/utils/type-utils";
import { applyCreatedBy } from "../auth";
import { db } from "../db";
import { getBalance } from "./balance";
import {
    getEatAmount,
    getFirmLevelFactor,
    getInflationCoef,
    getMonth,
    getTaxUpperBound,
    incrementMonth,
} from "./env-config";

export async function applyFirmsCostProductions(session: Session) {
    const month = await getMonth();
    const levelFactor = await getFirmLevelFactor();

    type Firm = GetFindResult<Prisma.$FirmPayload, { include: { ownerships: true } }>;
    type FirmCycle = GetFindResult<Prisma.$FirmCyclePayload, null>;

    const producingCycleFirms: { cycle: FirmCycle; firms: Firm[] }[] = [];

    const types = await db.firmType.findMany({
        include: { firms: { include: { ownerships: true } } },
    });
    for (const type of types) {
        const productions = {} as { [asset in `${Asset}Production`]: number };

        for (const asset of assets) {
            productions[`${asset}Production`] = Math.round(
                random.normal(
                    type[`production${capitalize(asset)}Mean`],
                    (type[`production${capitalize(asset)}Mean`] *
                        type[`production${capitalize(asset)}StdDevPerc`]) /
                        100,
                )(),
            );
        }

        const cycle = await db.firmCycle.create({
            data: applyCreatedBy(session, {
                month,
                firmTypeId: type.id,
                ...productions,
            }),
        });

        const producingFirms: Firm[] = [];
        producingCycleFirms.push({ cycle, firms: producingFirms });

        for (const firm of type.firms) {
            if (month < firm.activeFromMonth) {
                continue;
            }

            const factor = Math.pow(levelFactor, firm.level);
            let enoughBalance = true;

            for (const ownership of firm.ownerships) {
                const balance = await getBalance(ownership.playerId);
                for (const asset of assets) {
                    if (balance[asset] < ownership[`monthlyCost${capitalize(asset)}`] * factor) {
                        enoughBalance = false;
                        break;
                    }
                }
                if (!enoughBalance) {
                    break;
                }
            }

            if (!enoughBalance) {
                await db.firmCycleFail.create({
                    data: applyCreatedBy(session, {
                        firmId: firm.id,
                        firmCycleId: cycle.id,
                    }),
                });
                continue;
            }

            for (const ownership of firm.ownerships) {
                await db.exchange.create({
                    data: applyCreatedBy(session, {
                        month,
                        action: exchangeActions.firmCost,
                        firmCycleId: cycle.id,
                        receiverId: ownership.playerId,
                        ...createObjectFromEntries(
                            assets.map(
                                (asset) =>
                                    [
                                        `received${capitalize(asset)}`,
                                        -(ownership[`monthlyCost${capitalize(asset)}`] * factor),
                                    ] as const,
                            ),
                        ),
                    }),
                });
            }

            producingFirms.push(firm);
        }
    }

    // First apply all costs, then apply the productions, so production of a firm cannot be used as cost for another.

    for (const { cycle, firms } of producingCycleFirms) {
        for (const firm of firms) {
            const factor = Math.pow(levelFactor, firm.level);
            for (const ownership of firm.ownerships) {
                await db.exchange.create({
                    data: applyCreatedBy(session, {
                        month,
                        action: exchangeActions.firmProduction,
                        firmCycleId: cycle.id,
                        receiverId: ownership.playerId,
                        ...createObjectFromEntries(
                            assets.map(
                                (asset) =>
                                    [
                                        `received${capitalize(asset)}`,
                                        (cycle[`${asset}Production`] *
                                            factor *
                                            ownership.ownershipPerc) /
                                            100,
                                    ] as const,
                            ),
                        ),
                    }),
                });
            }
        }
    }
}

export async function applyTaxes(session: Session) {
    const month = await getMonth();
    const players = await db.player.findMany();

    const upperBounds = createObjectFromEntries(
        await Promise.all(
            assets.map(async (asset) => [asset, await getTaxUpperBound(asset)] as const),
        ),
    );

    function getTaxAmount(asset: Asset, assetAmount: number) {
        if (assetAmount < 0) {
            return 0;
        }
        const frac = 0.1 * 0.6 * Math.sqrt(assetAmount / upperBounds[asset]);
        return frac * assetAmount;
    }

    const totalTax = createObjectFromEntries(assets.map((asset) => [asset, 0] as const));

    for (const player of players) {
        const t = await db.exchange.aggregate({
            where: {
                receiverId: player.id,
                month,
                action: { in: [exchangeActions.firmCost, exchangeActions.firmProduction] },
            },
            _sum: createObjectFromEntries(
                assets.map((asset) => [`received${capitalize(asset)}`, true] as const),
            ),
        });

        const taxAmounts = createObjectFromEntries(
            assets.map(
                (asset) =>
                    [
                        asset,
                        Math.floor(
                            getTaxAmount(asset, t._sum[`received${capitalize(asset)}`] ?? 0),
                        ),
                    ] as const,
            ),
        );

        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.tax,
                receiverId: player.id,
                ...createObjectFromEntries(
                    assets.map(
                        (asset) => [`received${capitalize(asset)}`, -taxAmounts[asset]] as const,
                    ),
                ),
            }),
        });

        assets.forEach((asset) => {
            totalTax[asset] += taxAmounts[asset];
        });
    }

    for (const player of players) {
        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.nTax,
                receiverId: player.id,
                ...createObjectFromEntries(
                    assets.map(
                        (asset) =>
                            [
                                `received${capitalize(asset)}`,
                                totalTax[asset] / players.length,
                            ] as const,
                    ),
                ),
            }),
        });
    }
}

export async function applyInflation(session: Session) {
    const month = await getMonth();
    const players = await db.player.findMany();

    for (const player of players) {
        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.inflation,
                receiverId: player.id,
                ...createObjectFromEntries(
                    assets.map((asset) => [`received${capitalize(asset)}`, 0] as const),
                ),
                receivedCoin: 2000,
                receivedLumber: 500,
            }),
        });
    }

    return;

    const t = await db.exchange.aggregate({
        where: { senderId: null },
        _sum: createObjectFromEntries(
            assets.map((asset) => [`received${capitalize(asset)}`, true] as const),
        ),
    });

    const coefs = createObjectFromEntries(
        await Promise.all(
            assets.map(async (asset) => [asset, await getInflationCoef(asset)] as const),
        ),
    );

    const sum = assets
        .filter((a) => a !== "coin")
        .reduce((s, asset) => s + coefs[asset] * (t._sum[`received${capitalize(asset)}`] ?? 0), 0);

    const diff = sum / coefs.coin - (t._sum.receivedCoin ?? 0);

    for (const player of players) {
        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.inflation,
                receiverId: player.id,
                ...createObjectFromEntries(
                    assets.map((asset) => [`received${capitalize(asset)}`, 0] as const),
                ),
                receivedCoin: Math.floor(diff / players.length),
            }),
        });
    }
}

export async function applyEating(session: Session) {
    const month = await getMonth();
    const players = await db.player.findMany();
    const eatAmount = await getEatAmount();

    for (const player of players) {
        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.eat,
                receiverId: player.id,
                ...createObjectFromEntries(
                    assets.map((asset) => [`received${capitalize(asset)}`, 0] as const),
                ),
                receivedFood: -eatAmount,
            }),
        });
    }
}

export async function nextMonth(session: Session) {
    await incrementMonth(session);
    await applyEating(session);
    await applyFirmsCostProductions(session);
    await applyTaxes(session);
    await applyInflation(session);
}
