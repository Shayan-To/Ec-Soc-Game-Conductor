import { z } from "zod";
import { exchangeActions } from "~/base/entities";
import { createTRPCRouter, publicProcedure, publicProcedure } from "~/server/api/trpc";
import { setEquals } from "~/utils/collection-utls";
import { createObjectFromEntries, type UnArray } from "~/utils/type-utils";
import { applyCreatedBy } from "../auth";
import { getBalance } from "../service/balance";
import {
    setEatAmount,
    setFirmLevelFactor,
    setFirmMaxLevel,
    setTaxUpperBound,
} from "../service/env-config";
import { createTransferExchange, createTransferExchangeInputZod } from "../service/exchange";
import { createFirm, createFirmInputZod, upgradeFirm, upgradeFirmInputZod } from "../service/firm";
import { nextMonth } from "../service/monthly";
import { authenticatePlayerInputZod, authenticatePlayers } from "../service/player";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    init: publicProcedure.mutation(async ({ ctx }) => {
        const def = {
            monthlyCostCoin: 0,
            productionCoinMean: 0,
            productionCoinStdDevPerc: 0,
            productionFoodStdDevPerc: 25,
            productionLumberStdDevPerc: 25,
            productionIronStdDevPerc: 25,
        };
        await ctx.db.firmType.create({
            data: applyCreatedBy(ctx.session, {
                name: "مزرعه",
                costCoin: 800,
                costFood: 70,
                costLumber: 100,
                costIron: 0,
                monthlyCostFood: 20,
                monthlyCostLumber: 0,
                monthlyCostIron: 0,
                productionFoodMean: 100,
                productionLumberMean: 30,
                productionIronMean: 0,
                buildTimeMonths: 1 + 0,
                ...def,
            }),
        });
        await ctx.db.firmType.create({
            data: applyCreatedBy(ctx.session, {
                name: "باغ",
                costCoin: 1000,
                costFood: 170,
                costLumber: 150,
                costIron: 0,
                monthlyCostFood: 50,
                monthlyCostLumber: 0,
                monthlyCostIron: 0,
                productionFoodMean: 20,
                productionLumberMean: 150,
                productionIronMean: 0,
                buildTimeMonths: 1 + 0,
                ...def,
            }),
        });
        await ctx.db.firmType.create({
            data: applyCreatedBy(ctx.session, {
                name: "معدن",
                costCoin: 2000,
                costFood: 200,
                costLumber: 900,
                costIron: 0,
                monthlyCostFood: 250,
                monthlyCostLumber: 100,
                monthlyCostIron: 0,
                productionFoodMean: 0,
                productionLumberMean: 0,
                productionIronMean: 60,
                buildTimeMonths: 1 + 1,
                ...def,
            }),
        });
        await ctx.db.firmType.create({
            data: applyCreatedBy(ctx.session, {
                name: "کارخونه",
                costCoin: 2000,
                costFood: 400,
                costLumber: 400,
                costIron: 300,
                monthlyCostFood: 100,
                monthlyCostLumber: 0,
                monthlyCostIron: 0,
                productionFoodMean: 500,
                productionLumberMean: 0,
                productionIronMean: 0,
                buildTimeMonths: 1 + 1,
                ...def,
            }),
        });
        await ctx.db.firmType.create({
            data: applyCreatedBy(ctx.session, {
                name: "مکانیزه",
                costCoin: 2000,
                costFood: 600,
                costLumber: 1700,
                costIron: 400,
                monthlyCostFood: 800,
                monthlyCostLumber: 300,
                monthlyCostIron: 100,
                productionFoodMean: 0,
                productionLumberMean: 0,
                productionIronMean: 300,
                buildTimeMonths: 1 + 2,
                ...def,
            }),
        });

        await setFirmLevelFactor(ctx.session, 1.2);
        await setFirmMaxLevel(ctx.session, 2);
        await setTaxUpperBound(ctx.session, "coin", 100000);
        await setTaxUpperBound(ctx.session, "food", 500);
        await setTaxUpperBound(ctx.session, "lumber", 150);
        await setTaxUpperBound(ctx.session, "iron", 200);
        //await setInflationCoef(ctx.session, )
        await setEatAmount(ctx.session, 20);
    }),

    initialExchange: publicProcedure.mutation(async ({ ctx }) => {
        const players = await ctx.db.player.findMany();
        for (const player of players) {
            await ctx.db.exchange.create({
                data: applyCreatedBy(ctx.session, {
                    month: 0,
                    action: exchangeActions.init,
                    receiverId: player.id,
                    receivedCoin: 500,
                    receivedFood: 200,
                    receivedLumber: 200,
                    receivedIron: 100,
                }),
            });
        }
    }),

    nextMonth: publicProcedure.mutation(async ({ ctx }) => {
        await nextMonth(ctx.session);
    }),

    player: createTRPCRouter({
        getAll: publicProcedure.query(async ({ ctx }) => {
            const players = await ctx.db.player.findMany();
            return await Promise.all(
                players.map(async (player) => ({
                    player,
                    balance: await getBalance(player.id),
                })),
            );
        }),
    }),

    firmTypes: createTRPCRouter({
        getAll: publicProcedure.query(async ({ ctx }) => {
            return await ctx.db.firmType.findMany();
        }),
    }),

    firm: createTRPCRouter({
        getAll: publicProcedure.query(async ({ ctx }) => {
            const firmsList = await ctx.db.firm.findMany();
            type Firm = UnArray<typeof firmsList>;
            const firms = createObjectFromEntries(
                firmsList.map(
                    (firm) =>
                        [
                            firm.id,
                            {
                                ...firm,
                                nextLevels: [] as Firm[],
                            },
                        ] as const,
                ),
            );

            for (const firm of firmsList) {
                if (firm.prevLevelId !== null) {
                    let parentId = firm.prevLevelId;
                    while (firms[parentId]!.prevLevelId !== null) {
                        parentId = firms[parentId]!.prevLevelId!;
                    }
                    firms[parentId]!.nextLevels.push(firm);
                }
            }

            for (const firm of firmsList) {
                if (firm.prevLevelId !== null) {
                    delete firms[firm.id];
                }
            }

            return Object.values(firms);
        }),

        create: publicProcedure
            .input(
                z.object({
                    auth: authenticatePlayerInputZod.array(),
                    data: createFirmInputZod,
                }),
            )
            .mutation(async ({ ctx, input }) => {
                if (
                    !setEquals(
                        input.auth.map((a) => a.playerId),
                        input.data.ownerships.map((o) => o.playerId),
                    )
                ) {
                    throw new Error(`playerIds of ownerships does not match auth.`);
                }
                if (!(await authenticatePlayers(input.auth))) {
                    throw new Error(`Invalid auth.`);
                }
                return await createFirm(ctx.session, input.data);
            }),

        upgrade: publicProcedure
            .input(
                z.object({
                    auth: authenticatePlayerInputZod.array(),
                    data: upgradeFirmInputZod,
                }),
            )
            .mutation(async ({ ctx, input }) => {
                if (
                    !setEquals(
                        input.auth.map((a) => a.playerId),
                        input.data.ownerships.map((o) => o.playerId),
                    )
                ) {
                    throw new Error(`playerIds of ownerships does not match auth.`);
                }
                if (!(await authenticatePlayers(input.auth))) {
                    throw new Error(`Invalid auth.`);
                }
                return await upgradeFirm(ctx.session, input.data);
            }),
    }),

    exchange: createTRPCRouter({
        createTransfer: publicProcedure
            .input(
                z.object({
                    auth: authenticatePlayerInputZod.array(),
                    data: createTransferExchangeInputZod,
                }),
            )
            .mutation(async ({ ctx, input }) => {
                if (
                    !setEquals(
                        input.auth.map((a) => a.playerId),
                        [input.data.senderId, input.data.receiverId],
                    )
                ) {
                    throw new Error(`senderId and receiverId does not match auth.`);
                }
                if (!(await authenticatePlayers(input.auth))) {
                    throw new Error(`Invalid auth.`);
                }
                return await createTransferExchange(ctx.session, input.data);
            }),
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
