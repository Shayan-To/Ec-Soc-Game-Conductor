"use client";

/* eslint-disable react-hooks/rules-of-hooks */

import { Paper } from "@mui/material";
import { Suspense, useEffect } from "react";
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

    useEffect(() => {
        const t = setInterval(() => location.reload, 5000);
        return () => clearInterval(t);
    }, []);

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
