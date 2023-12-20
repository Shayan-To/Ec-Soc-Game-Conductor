"use client";

/* eslint-disable react-hooks/rules-of-hooks */

import { Button, Paper, TextField } from "@mui/material";
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

    const shareSum = state.playerData.filter((pd) => pd.enabled).reduce((s, pd) => s + pd.share, 0);

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
                        <div className="row">{shareSum}% / 100%</div>
                    </Paper>

                    {state.playerData.map((pd, i) => (
                        <Paper
                            key={i}
                            className="margin-a-2"
                            style={{ background: pd.enabled ? "white" : "grey" }}
                        >
                            <span>{pd.player.name}</span>
                            <Button
                                onClick={() => {
                                    pd.enabled = !pd.enabled;
                                    render();
                                }}
                            >
                                فعال / غیر فعال
                            </Button>
                            {pd.enabled && (
                                <>
                                    <TextField
                                        label="درصد شراکت"
                                        value={pd.share}
                                        onChange={({ target }) => {
                                            pd.share = +target.value;
                                            render();
                                        }}
                                        error={shareSum !== 100}
                                    />
                                    <TextField
                                        label="رمز"
                                        value={pd.password}
                                        onChange={({ target }) => {
                                            pd.password = target.value;
                                            render();
                                        }}
                                        type="password"
                                    />

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
                                                        pd[`cost${capitalize(asset)}`] =
                                                            +target.value;
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
                                                        pd[`cost${capitalize(asset)}`] =
                                                            +target.value;
                                                        render();
                                                    }}
                                                    error={
                                                        costSums[asset] !==
                                                        state.firmType![
                                                            `monthlyCost${capitalize(asset)}`
                                                        ]
                                                    }
                                                />
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Paper>
                    ))}
                </div>
            )}
        </div>
    );
}
