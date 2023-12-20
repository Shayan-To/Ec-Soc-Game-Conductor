import { getRouter } from "~/core/next/next-sc-router";
import { normalizeToArray, omitFromObject } from "~/core/utils";
import { useRouterReady, whenRouterReady } from "./router-ready";

/**
 * @returns an object.
 * For each key...
 * - If it is not in the query params, it will be absent from the object.
 * - If it is empty, its value will be `undefined`.
 * - Otherwise, it will contain the query param value.
 */
export function getRouteParams<Keys extends string>(...keys: Keys[]) {
    const router = getRouter();
    const r: { [key in Keys]?: string } = {};
    for (const k of keys) {
        const v = normalizeToArray(router.query[k])[0];
        if (v !== undefined) {
            // "" -> undefined
            r[k] = v || undefined;
        }
    }
    return r;
}

export function stripRouteParams(...keys: string[]) {
    whenRouterReady(() => {
        const router = getRouter();
        const query = router.query;
        if (keys.find(k => k in query) === undefined) {
            return;
        }
        router.replace({ query: omitFromObject(query, ...keys) }, undefined, {
            scroll: false,
        });
    });
}

export function useApplyRouteParams<Keys extends string>(
    keys: readonly Keys[],
    apply: (params: { [key in Keys]?: string | undefined }) => void,
) {
    useRouterReady(() => {
        const params = getRouteParams(...keys);
        apply(params);
    });
}
