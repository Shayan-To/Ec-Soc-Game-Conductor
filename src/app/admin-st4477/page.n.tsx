"use client";

/* eslint-disable react-hooks/rules-of-hooks */

import { Button } from "@mui/material";
import { Suspense } from "react";
import { useStateRef } from "~/core/hooks";
import { api } from "~/trpc/react";
import { UnArray } from "~/utils/type-utils";

export default function CreateFirm2() {
    return (
        <Suspense>
            <CreateFirm />
        </Suspense>
    );
}

function CreateFirm() {
    const [firmTypes] = api.firmTypes.getAll.useSuspenseQuery();
    const state = useStateRef(() => ({
        firmType: null as UnArray<typeof firmTypes> | null,
    }));
    const init = api.init.useMutation();
    const initialExchange = api.initialExchange.useMutation();
    const nextMonth = api.nextMonth.useMutation();

    return (
        <div>
            <Button
                onClick={() => {
                    initialExchange.mutate();
                }}
            >
                initialExchange
            </Button>
            <Button
                onClick={() => {
                    nextMonth.mutate();
                }}
            >
                nextMonth
            </Button>
        </div>
    );
}
