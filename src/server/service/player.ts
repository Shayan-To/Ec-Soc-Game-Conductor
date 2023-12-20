import { z } from "zod";
import { db } from "../db";

export const authenticatePlayerInputZod = z.object({
    playerId: z.number().int(),
    password: z.string().length(6),
});

export async function authenticatePlayer(data: z.infer<typeof authenticatePlayerInputZod>) {
    const player = await db.player.findFirst({
        where: { id: data.playerId },
    });
    if (player === null) {
        throw new Error(`playerId ${data.playerId} not found.`);
    }

    return player.password === data.password;
}

export async function authenticatePlayers(data: z.infer<typeof authenticatePlayerInputZod>[]) {
    for (const auth of data) {
        if (!(await authenticatePlayer(auth))) {
            return false;
        }
    }
    return true;
}
