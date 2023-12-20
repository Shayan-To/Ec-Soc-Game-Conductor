import { type Session } from "next-auth";
import { z } from "zod";
import { assets, exchangeActions } from "~/base/entities";
import { capitalize, createObjectFromEntries } from "~/utils/type-utils";
import { applyCreatedBy } from "../auth";
import { db } from "../db";
import { getBalance } from "./balance";
import { getMonth } from "./env-config";

export const createTransferExchangeInputZod = z.object({
    senderId: z.number().int(),
    receiverId: z.number().int(),
    ...createObjectFromEntries(
        assets.map((asset) => [`received${capitalize(asset)}`, z.number().int()] as const),
    ),
});

export async function createTransferExchange(
    session: Session,
    data: z.infer<typeof createTransferExchangeInputZod>,
) {
    const month = await getMonth();

    const sender = await db.player.findFirst({
        where: { id: data.senderId },
    });
    if (sender === null) {
        throw new Error(`senderId ${data.senderId} not found.`);
    }

    const receiver = await db.player.findFirst({
        where: { id: data.receiverId },
    });
    if (receiver === null) {
        throw new Error(`receiverId ${data.receiverId} not found.`);
    }

    const senderBalance = await getBalance(sender.id);
    const receiverBalance = await getBalance(receiver.id);
    for (const asset of assets) {
        const receivedAssetValue = data[`received${capitalize(asset)}`];
        const balance = receivedAssetValue > 0 ? senderBalance : receiverBalance;
        const player = receivedAssetValue > 0 ? sender : receiver;
        if (balance[asset] < Math.abs(receivedAssetValue)) {
            throw new Error(
                `transferred ${asset} by player ${player.name} exceeds balance. (given: ${Math.abs(
                    receivedAssetValue,
                )}, balance: ${balance[asset]})`,
            );
        }
    }

    await db.exchange.create({
        data: applyCreatedBy(session, {
            month,
            action: exchangeActions.transfer,
            senderId: sender.id,
            receiverId: receiver.id,
            ...createObjectFromEntries(
                assets.map(
                    (asset) =>
                        [
                            `received${capitalize(asset)}`,
                            data[`received${capitalize(asset)}`],
                        ] as const,
                ),
            ),
        }),
    });
}
