import { getTrue } from "~/core/utils";
import { Router } from "next/router";
import { useEffect, useReducer, useRef } from "react";
import { getRouter } from "./next-sc-router";

let isRouterReady = false;

Router.events.on("beforeHistoryChange", function onBeforeHistoryChange(...args: any[]) {
    console.log("## DEBUG ## beforeHistoryChange(", ...args, ")");
    setRouterReady();
});

function setRouterReady() {
    if (routerReady()) {
        return;
    }
    isRouterReady = true;
    routerReadyActions.splice(0, routerReadyActions.length).forEach((ac) => ac());
}

export function routerReady() {
    return isRouterReady;
}

const routerReadyActions: (() => void)[] = [];

export function whenRouterReady(action: () => void) {
    if (routerReady()) {
        action();
    } else {
        routerReadyActions.push(action);
    }
}

export function useRouterReady(action: (router: Router) => void) {
    const [state, set] = useReducer(getTrue, false);
    const isRun = useRef(false);
    // Capture routerReady at render time, so it is consistent with other hook values.
    const isRouterReady = routerReady();

    useEffect(() => {
        if (isRun.current) {
            return;
        }
        if (isRouterReady) {
            action(getRouter());
            isRun.current = true;
            return;
        }
        whenRouterReady(set);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, isRouterReady]);
}
