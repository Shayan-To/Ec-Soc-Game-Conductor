import { createObjectFromEntries, type UnArray } from "~/utils/type-utils";

export const assets = ["coin", "food", "lumber", "iron"] as const;
export type Asset = UnArray<typeof assets>;

export type Balance = {
    [asset in Asset]: number;
};

export const exchangeActionsList = [
    "init",
    "build",
    "firmCost",
    "firmProduction",
    "tax",
    "nTax",
    "inflation",
    "eat",
    "transfer",
] as const;
export const exchangeActions = createObjectFromEntries(
    exchangeActionsList.map((k) => [k, k] as const),
);
export type EnvConfigKey = UnArray<typeof exchangeActionsList>;
