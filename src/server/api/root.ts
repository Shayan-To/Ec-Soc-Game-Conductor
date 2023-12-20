import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { setEquals } from "~/utils/collection-utls";
import { createObjectFromEntries, type UnArray } from "~/utils/type-utils";
import { getBalance } from "../service/balance";
import { createTransferExchange, createTransferExchangeInputZod } from "../service/exchange";
import { createFirm, createFirmInputZod, upgradeFirm, upgradeFirmInputZod } from "../service/firm";
import { authenticatePlayerInputZod, authenticatePlayers } from "../service/player";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
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

        create: protectedProcedure
            .input(
                z.object({
                    auth: authenticatePlayerInputZod.array(),
                    data: createFirmInputZod,
                }),
            )
            .query(async ({ ctx, input }) => {
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

        upgrade: protectedProcedure
            .input(
                z.object({
                    auth: authenticatePlayerInputZod.array(),
                    data: upgradeFirmInputZod,
                }),
            )
            .query(async ({ ctx, input }) => {
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
        createTransfer: protectedProcedure
            .input(
                z.object({
                    auth: authenticatePlayerInputZod.array(),
                    data: createTransferExchangeInputZod,
                }),
            )
            .query(async ({ ctx, input }) => {
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
