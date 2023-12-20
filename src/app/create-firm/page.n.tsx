"use client";

/* eslint-disable react-hooks/rules-of-hooks */

import { Paper, TextField } from "@mui/material";
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
            ...createObjectFromEntries(
                assets.map((asset) => [`cost${capitalize(asset)}`, 0 as number] as const),
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
                        .reduce((s, pd) => s + pd[`cost${capitalize(asset)}`], 0),
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

    return (
        <div>
            <h1>تولیدی جدید</h1>
            <div>
                {state.firmType === null &&
                    firmTypes.map((firmType, i) => (
                        <Paper
                            key={i}
                            className="margin-a-2"
                            onClick={() => (state.firmType = firmType)}
                        >
                            <span>{firmType.name}</span>
                            <div className="row">
                                <span className="grow-equally"></span>
                                {assets.map((asset, i) => (
                                    <span key={i} className="grow-equally">
                                        {assetIcons[asset]}
                                    </span>
                                ))}
                            </div>
                            <div className="row">
                                <span className="grow-equally">ساخت</span>
                                {assets.map((asset, i) => (
                                    <span key={i} className="grow-equally">
                                        {firmType[`cost${capitalize(asset)}`]}
                                    </span>
                                ))}
                            </div>
                            <div className="row">
                                <span className="grow-equally">ماهانه</span>
                                {assets.map((asset, i) => (
                                    <span key={i} className="grow-equally">
                                        {firmType[`monthlyCost${capitalize(asset)}`]}
                                    </span>
                                ))}
                            </div>
                            <div className="row">
                                <span className="grow-equally">تولید</span>
                                {assets.map((asset, i) => (
                                    <span key={i} className="grow-equally">
                                        {firmType[`production${capitalize(asset)}Mean`]} {}±
                                        {firmType[`production${capitalize(asset)}StdDevPerc`]}%
                                    </span>
                                ))}
                            </div>
                        </Paper>
                    ))}
            </div>
            {state.firmType !== null && (
                <div>
                    <Paper className="margin-a-2">
                        <span>{state.firmType.name}</span>
                        <div className="row">
                            <span className="grow-equally"></span>
                            {assets.map((asset, i) => (
                                <span key={i} className="grow-equally">
                                    {assetIcons[asset]}
                                </span>
                            ))}
                        </div>
                        <div className="row">
                            <span className="grow-equally">ساخت</span>
                            {assets.map((asset, i) => (
                                <span key={i} className="grow-equally">
                                    {costSums[asset]} /{" "}
                                    {state.firmType![`cost${capitalize(asset)}`]}
                                </span>
                            ))}
                        </div>
                        <div className="row">
                            <span className="grow-equally">ماهانه</span>
                            {assets.map((asset, i) => (
                                <span key={i} className="grow-equally">
                                    {mCostSums[asset]} /{" "}
                                    {state.firmType![`monthlyCost${capitalize(asset)}`]}
                                </span>
                            ))}
                        </div>
                    </Paper>

                    {state.playerData.map((pd, i) => (
                        <Paper
                            key={i}
                            className="margin-a-2"
                            onClick={() => {
                                pd.enabled = !pd.enabled;
                                render();
                            }}
                            style={{ background: pd.enabled ? "white" : "grey" }}
                        >
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
                            <div className="row">
                                <span className="grow-equally">هزینه‌ی پرداختی</span>
                                {assets.map((asset, i) => (
                                    <span key={i} className="grow-equally">
                                        <TextField
                                            value={pd[`cost${capitalize(asset)}`]}
                                            onChange={({ target }) => {
                                                pd[`cost${capitalize(asset)}`] = +target.value;
                                                render();
                                            }}
                                            error={
                                                costSums[asset] !==
                                                state.firmType![`cost${capitalize(asset)}`]
                                            }
                                        />
                                    </span>
                                ))}
                            </div>
                            <div className="row">
                                <span className="grow-equally">هزینه‌ی ماهانه</span>
                                {assets.map((asset, i) => (
                                    <span key={i} className="grow-equally">
                                        <TextField
                                            value={pd[`cost${capitalize(asset)}`]}
                                            onChange={({ target }) => {
                                                pd[`cost${capitalize(asset)}`] = +target.value;
                                                render();
                                            }}
                                            error={
                                                costSums[asset] !==
                                                state.firmType![`monthlyCost${capitalize(asset)}`]
                                            }
                                        />
                                    </span>
                                ))}
                            </div>
                        </Paper>
                    ))}
                </div>
            )}
        </div>
    );
}
