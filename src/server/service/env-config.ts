import { type Prisma } from "@prisma/client";
import { type GetFindResult } from "@prisma/client/runtime/library";
import { type Session } from "next-auth";
import { assets, type Asset } from "~/base/entities";
import { capitalize, createObjectFromEntries, type UnArray } from "~/utils/type-utils";
import { applyCreatedBy } from "../auth";
import { db } from "../db";

export type EnvConfig = GetFindResult<Prisma.$EnvConfigPayload, any>;

export const envConfigKeysList = [
    "month",
    "firmLevelFactor",
    "firmMaxLevel",
    ...assets.map((asset) => `tax${capitalize(asset)}UpperBound` as const),
    ...assets.map((asset) => `inflation${capitalize(asset)}Coef` as const),
    "eatAmount",
] as const;
export const envConfigKeys = createObjectFromEntries(envConfigKeysList.map((k) => [k, k] as const));
export type EnvConfigKey = UnArray<typeof envConfigKeysList>;

export async function getEnvConfig(key: EnvConfigKey, miss?: "throw"): Promise<EnvConfig>;
export async function getEnvConfig(key: EnvConfigKey, miss: "null"): Promise<EnvConfig | null>;
export async function getEnvConfig(key: EnvConfigKey, miss: "throw" | "null" = "throw") {
    const conf = await db.envConfig.findFirst({
        where: { key },
        orderBy: { id: "desc" },
    });
    if (miss === "throw" && conf === null) {
        throw new Error(`${key} env config not set.`);
    }
    return conf;
}

export async function setEnvConfig(session: Session, key: EnvConfigKey, value: string) {
    await db.envConfig.create({
        data: applyCreatedBy(session, { key, value }),
    });
}

export async function getMonth() {
    const conf = await getEnvConfig("month", "null");
    return +(conf?.value ?? "0");
}

export async function incrementMonth(session: Session) {
    await setEnvConfig(session, envConfigKeys.month, `${(await getMonth()) + 1}`);
}

export async function getFirmLevelFactor() {
    return +(await getEnvConfig("firmLevelFactor")).value;
}

export async function setFirmLevelFactor(session: Session, value: number) {
    await setEnvConfig(session, "firmLevelFactor", `${value}`);
}

export async function getFirmMaxLevel() {
    return +(await getEnvConfig("firmMaxLevel")).value;
}

export async function setFirmMaxLevel(session: Session, value: number) {
    await setEnvConfig(session, "firmMaxLevel", `${value}`);
}

export async function getTaxUpperBound(asset: Asset) {
    return +(await getEnvConfig(`tax${capitalize(asset)}UpperBound`)).value;
}

export async function setTaxUpperBound(session: Session, asset: Asset, value: number) {
    await setEnvConfig(session, `tax${capitalize(asset)}UpperBound`, `${value}`);
}

export async function getInflationCoef(asset: Asset) {
    return +(await getEnvConfig(`inflation${capitalize(asset)}Coef`)).value;
}

export async function setInflationCoef(session: Session, asset: Asset, value: number) {
    await setEnvConfig(session, `inflation${capitalize(asset)}Coef`, `${value}`);
}

export async function getEatAmount() {
    return +(await getEnvConfig("eatAmount")).value;
}

export async function setEatAmount(session: Session, value: number) {
    await setEnvConfig(session, "eatAmount", `${value}`);
}
