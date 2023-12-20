import { type Session } from "next-auth";
import { assets, exchangeActions, type Asset } from "~/base/entities";
import { capitalize, createObjectFromEntries } from "~/utils/type-utils";
import { applyCreatedBy } from "../auth";
import { db } from "../db";
import { getBalance } from "./balance";
import { getFirmMaxLevel, getMonth } from "./env-config";

export async function createFirm(
    session: Session,
    data: {
        typeId: number;
        ownerships: ({
            playerId: number;
            ownershipPerc: number;
        } & {
            [k in `monthlyCost${Capitalize<Asset>}`]: number;
        } & {
            [k in `payed${Capitalize<Asset>}`]: number;
        })[];
    },
) {
    const month = await getMonth();
    const type = await db.firmType.findFirst({ where: { id: data.typeId } });
    if (type === null) {
        throw new Error(`typeId ${data.typeId} not found.`);
    }

    const players = createObjectFromEntries(
        await Promise.all(
            data.ownerships.map(
                async (o) =>
                    [o.playerId, await db.player.findFirst({ where: { id: o.playerId } })] as const,
            ),
        ),
    );
    data.ownerships.forEach((o) => {
        if (players[o.playerId] === null) {
            throw new Error(`playerId ${o.playerId} not found.`);
        }
    });

    const totalPerc = data.ownerships.reduce((s, o) => s + o.ownershipPerc, 0);
    // data.ownerships.forEach(o => o.ownershipPerc = Math.round(o.ownershipPerc / totalPerc * 100));
    if (Math.abs(totalPerc - 100) > 5) {
        throw new Error("ownershipPerc don't sum up to 100.");
    }

    for (const asset of assets) {
        const totalAssetMonthlyCost = data.ownerships.reduce(
            (s, o) => s + o[`monthlyCost${capitalize(asset)}`],
            0,
        );
        const totalAssetPayed = data.ownerships.reduce(
            (s, o) => s + o[`payed${capitalize(asset)}`],
            0,
        );
        if (totalAssetMonthlyCost !== type[`monthlyCost${capitalize(asset)}`]) {
            throw new Error(
                `monthly cost for ${asset} does not match. (total: ${totalAssetMonthlyCost}, required: ${
                    type[`monthlyCost${capitalize(asset)}`]
                })`,
            );
        }
        if (totalAssetPayed !== type[`cost${capitalize(asset)}`]) {
            throw new Error(
                `payed cost for ${asset} does not match. (total: ${totalAssetPayed}, required: ${
                    type[`cost${capitalize(asset)}`]
                })`,
            );
        }
    }

    for (const ownership of data.ownerships) {
        const balance = await getBalance(ownership.playerId);
        for (const asset of assets) {
            if (balance[asset] < ownership[`payed${capitalize(asset)}`]) {
                throw new Error(
                    `payed cost for ${asset} by player ${
                        players[ownership.playerId]!.name
                    } exceeds balance. (payed: ${
                        ownership[`payed${capitalize(asset)}`]
                    }, balance: ${balance[asset]})`,
                );
            }
        }
    }

    const firm = await db.firm.create({
        data: applyCreatedBy(session, {
            builtAtMonth: month,
            activeFromMonth: month + type.buildTimeMonths,
            level: 0,
            typeId: type.id,
        }),
    });

    for (const ownership of data.ownerships) {
        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.build,
                receiverId: ownership.playerId,
                ...createObjectFromEntries(
                    assets.map(
                        (asset) =>
                            [
                                `received${capitalize(asset)}`,
                                -ownership[`payed${capitalize(asset)}`],
                            ] as const,
                    ),
                ),
            }),
        });
    }

    for (const ownership of data.ownerships) {
        await db.firmOwnership.create({
            data: applyCreatedBy(session, {
                firmId: firm.id,
                playerId: ownership.playerId,
                ownershipPerc: ownership.ownershipPerc,
                ...createObjectFromEntries(
                    assets.map(
                        (asset) =>
                            [
                                `monthlyCost${capitalize(asset)}`,
                                ownership[`monthlyCost${capitalize(asset)}`],
                            ] as const,
                    ),
                ),
            }),
        });
    }
}

export async function upgradeFirm(
    session: Session,
    data: {
        firmId: number;
        ownerships: ({
            playerId: number;
        } & {
            [k in `monthlyCost${Capitalize<Asset>}`]: number;
        } & {
            [k in `payed${Capitalize<Asset>}`]: number;
        })[];
    },
) {
    const month = await getMonth();
    const maxLevel = await getFirmMaxLevel();

    const firm = await db.firm.findFirst({
        where: { id: data.firmId },
        include: { type: true, ownerships: true, nextLevel: true },
    });
    if (firm === null) {
        throw new Error(`firmId ${data.firmId} not found.`);
    }

    if (firm.nextLevel.length !== 0) {
        throw new Error(`Already leveled up.`);
    }

    if (firm.level >= maxLevel) {
        throw new Error(`Max level ${maxLevel} reached.`);
    }

    const players = createObjectFromEntries(
        await Promise.all(
            data.ownerships.map(
                async (o) =>
                    [o.playerId, await db.player.findFirst({ where: { id: o.playerId } })] as const,
            ),
        ),
    );
    data.ownerships.forEach((o) => {
        if (players[o.playerId] === null) {
            throw new Error(`playerId ${o.playerId} not found.`);
        }
    });

    data.ownerships.forEach((o) => {
        if (firm.ownerships.some((fo) => fo.playerId === o.playerId)) {
            throw new Error(`playerId ${o.playerId} is not an owner of this firm.`);
        }
    });
    firm.ownerships.forEach((o) => {
        if (data.ownerships.some((fo) => fo.playerId === o.playerId)) {
            throw new Error(`firm owner ${o.playerId} is not included in data.`);
        }
    });

    for (const asset of assets) {
        const totalAssetMonthlyCost = data.ownerships.reduce(
            (s, o) => s + o[`monthlyCost${capitalize(asset)}`],
            0,
        );
        const totalAssetPayed = data.ownerships.reduce(
            (s, o) => s + o[`payed${capitalize(asset)}`],
            0,
        );
        if (totalAssetMonthlyCost !== firm.type[`monthlyCost${capitalize(asset)}`]) {
            throw new Error(
                `monthly cost for ${asset} does not match. (total: ${totalAssetMonthlyCost}, required: ${
                    firm.type[`monthlyCost${capitalize(asset)}`]
                })`,
            );
        }
        if (totalAssetPayed !== firm.type[`cost${capitalize(asset)}`]) {
            throw new Error(
                `payed cost for ${asset} does not match. (total: ${totalAssetPayed}, required: ${
                    firm.type[`cost${capitalize(asset)}`]
                })`,
            );
        }
    }

    for (const ownership of data.ownerships) {
        const balance = await getBalance(ownership.playerId);
        for (const asset of assets) {
            if (ownership[`payed${capitalize(asset)}`] < 0) {
                throw new Error(
                    `payed cost for ${asset} by player ${
                        players[ownership.playerId]!.name
                    } is negative. (${ownership[`payed${capitalize(asset)}`]})`,
                );
            }
            if (balance[asset] < ownership[`payed${capitalize(asset)}`]) {
                throw new Error(
                    `payed cost for ${asset} by player ${
                        players[ownership.playerId]!.name
                    } exceeds balance. (payed: ${
                        ownership[`payed${capitalize(asset)}`]
                    }, balance: ${balance[asset]})`,
                );
            }
        }
    }

    const newFirm = await db.firm.create({
        data: applyCreatedBy(session, {
            builtAtMonth: month,
            activeFromMonth: month + firm.type.buildTimeMonths,
            level: firm.level + 1,
            prevLevelId: firm.id,
            typeId: firm.type.id,
        }),
    });

    for (const ownership of data.ownerships) {
        await db.exchange.create({
            data: applyCreatedBy(session, {
                month,
                action: exchangeActions.build,
                receiverId: ownership.playerId,
                ...createObjectFromEntries(
                    assets.map(
                        (asset) =>
                            [
                                `received${capitalize(asset)}`,
                                -ownership[`payed${capitalize(asset)}`],
                            ] as const,
                    ),
                ),
            }),
        });
    }

    for (const ownership of data.ownerships) {
        await db.firmOwnership.create({
            data: applyCreatedBy(session, {
                firmId: newFirm.id,
                playerId: ownership.playerId,
                ownershipPerc: firm.ownerships.find((o) => o.playerId === ownership.playerId)!
                    .ownershipPerc,
                ...createObjectFromEntries(
                    assets.map(
                        (asset) =>
                            [
                                `monthlyCost${capitalize(asset)}`,
                                ownership[`monthlyCost${capitalize(asset)}`],
                            ] as const,
                    ),
                ),
            }),
        });
    }
}
