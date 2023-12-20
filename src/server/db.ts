import { PrismaClient } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

import { env } from "~/env";

console.log(
    `################################ Initializing db instance #################################################`,
);

export const baseDb = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export const db = baseDb.$extends(
    createSoftDeleteExtension({
        models: {
            User: true,
            EnvConfig: true,
            Exchange: true,
            Firm: true,
            FirmCycle: true,
            FirmCycleFail: true,
            FirmOwnership: true,
            FirmType: true,
            Player: true,
        },
        defaultConfig: {
            field: "deletedAt",
            createValue: (deleted) => (deleted ? new Date() : null),
            allowToOneUpdates: true,
        },
    }),
);

if (true || env.NODE_ENV !== "production") {
    Object.assign(globalThis, { prisma: db });
}
