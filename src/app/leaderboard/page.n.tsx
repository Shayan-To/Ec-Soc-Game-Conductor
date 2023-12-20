"use client";

/* eslint-disable react-hooks/rules-of-hooks */

import { Paper } from "@mui/material";
import { Suspense } from "react";
import { assets } from "~/base/entities";
import { useStateRef } from "~/core/hooks";
import { api } from "~/trpc/react";
import { UnArray, capitalize, createObjectFromEntries } from "~/utils/type-utils";
import { assetIcons } from "../icons";

export default function CreateFirm2() {
    return (
        <Suspense>
            <CreateFirm />
        </Suspense>
    );
}

function CreateFirm() {
    const [firmTypes] = api.firmTypes.getAll.useSuspenseQuery();
    const [players] = api.player.getAll.useSuspenseQuery();
    const state = useStateRef(() => ({
        firmType: null as UnArray<typeof firmTypes> | null,
        playerData: players.map((player) => ({
            ...player,
            enabled: false,
            share: 100,
            password: "",
            ...createObjectFromEntries(
                assets.map((asset) => [`payed${capitalize(asset)}`, 0 as number] as const),
            ),
            ...createObjectFromEntries(
                assets.map((asset) => [`monthlyCost${capitalize(asset)}`, 0 as number] as const),
            ),
        })),
        version: 0,
    }));
    async function render() {
        state.version = (await state.currentState).version + 1;
    }

    const create = api.firm.create.useMutation();

    const costSums = createObjectFromEntries(
        assets.map(
            (asset) =>
                [
                    asset,
                    state.playerData
                        .filter((pd) => pd.enabled)
                        .reduce((s, pd) => s + pd[`payed${capitalize(asset)}`], 0),
                ] as const,
        ),
    );

    const mCostSums = createObjectFromEntries(
        assets.map(
            (asset) =>
                [
                    asset,
                    state.playerData
                        .filter((pd) => pd.enabled)
                        .reduce((s, pd) => s + pd[`monthlyCost${capitalize(asset)}`], 0),
                ] as const,
        ),
    );

    const shareSum = state.playerData.filter((pd) => pd.enabled).reduce((s, pd) => s + pd.share, 0);

    return (
        <div>
            {players.map((pd, i) => (
                <Paper key={i} className="margin-a-2">
                    <span>{pd.player.name}</span>
                    <div className="row">
                        <span className="grow-equally"></span>
                        {assets.map((asset, i) => (
                            <span key={i} className="grow-equally">
                                {assetIcons[asset]}
                            </span>
                        ))}
                    </div>
                    <div className="row">
                        <span className="grow-equally">موجودی</span>
                        {assets.map((asset, i) => (
                            <span key={i} className="grow-equally">
                                {pd.balance[asset]}
                            </span>
                        ))}
                    </div>
                </Paper>
            ))}
        </div>
    );
}
