import { assets, type Balance } from "~/base/entities";
import { capitalize, createObjectFromEntries } from "~/utils/type-utils";
import { db } from "../db";

export async function getBalance(playerId: number): Promise<Balance> {
    const player = await db.player.findUniqueOrThrow({ where: { id: playerId } });

    const received = await db.exchange.aggregate({
        where: { receiverId: player.id },
        _sum: createObjectFromEntries(
            assets.map((asset) => [`received${capitalize(asset)}`, true] as const),
        ),
    });

    const sent = await db.exchange.aggregate({
        where: { senderId: player.id },
        _sum: createObjectFromEntries(
            assets.map((asset) => [`received${capitalize(asset)}`, true] as const),
        ),
    });

    return createObjectFromEntries(
        assets.map(
            (asset) =>
                [
                    asset,
                    (received._sum[`received${capitalize(asset)}`] ?? 0) -
                        (sent._sum[`received${capitalize(asset)}`] ?? 0),
                ] as const,
        ),
    );
}
