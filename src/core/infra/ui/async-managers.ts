import { incrementVersion } from "~/core/utils";
import {
    combineDisposableVoidFunctions,
    type Disposable,
    disposeProps,
    makeDisposable,
} from "~/core/utils/disposables";
import { forceProperty, forceType, type TypedOmit } from "~/core/utils/type-utils";

/*
    simultaneousRuns?: "single" | "latest" | "multiple"; // = "latest"
    mode?: "no-notify" | "just-notify" | "retry" | "retry-no-timeout"; // = "just-notify"
    customErrorMessage?: Parameters<typeof getErrorMessage>[1];
    noUnmount?: boolean;
*/

export type VersionFunction<Args extends any[], Result> = (
    t: "newRun" | "afterRun" | "getCurrent" | "forceInvalidate",
    d?: TypedOmit<
        AsyncOperationManager.ManagedResult<Args, Result, "data" | "error" | "none">,
        "version" | "expired"
    >,
) => string | number;

export type VersionFunctionGr = <Args extends any[], Result>(
    t: "newRun" | "afterRun" | "getCurrent" | "forceInvalidate",
    d?: TypedOmit<
        AsyncOperationManager.ManagedResult<Args, Result, "data" | "error" | "none">,
        "version" | "expired"
    >,
) => string | number;

export namespace AsyncOperationManager {
    export interface Config<Args extends any[], Result> {
        version?: VersionFunction<Args, Result>;
        addLoadingCounter?: (inc: number) => void;
        onSuccess?: ((e: ManagedResult<Args, Result, "data"> & { expired?: undefined }) => void) &
            Disposable;
        onError?: ((e: ManagedResult<Args, Result, "error"> & { expired?: undefined }) => void) &
            Disposable;
        onEvent?: ((e: ManagedResult<Args, Result, "data" | "error" | "none">) => void) &
            Disposable;
    }

    export type ManagedResult<
        Args extends any[],
        Result,
        Kind extends "error" | "data" | "none" = "error" | "data",
    > = (
        | ("data" extends Kind ? { data: Result; kind: "data" } : never)
        | ("error" extends Kind ? { error: unknown; kind: "error" } : never)
        | ("none" extends Kind ? {} : never)
    ) & {
        runId: number;
        version: number | string;
        args: Args;
        expired?: true;
    };

    export type ManagedFunction<Args extends any[], Result> = ((
        ...args: Args
    ) => Promise<ManagedResult<Args, Result>>) &
        Disposable;

    export interface Manager<Args extends any[], Result> extends Disposable {
        action: ManagedFunction<Args, Result>;
        lastRunPromise(): Promise<ManagedResult<Args, Result>>;
        version: (d: "getCurrent" | "forceInvalidate") => number | string;
        currentRunId(): number;
    }
}

function constantVersion() {
    return 0;
}

export function asyncOperationManager<Args extends any[], Result>(
    func: (...args: Args) => Result | Promise<Result>,
    config: AsyncOperationManager.Config<Args, Result> = {},
): AsyncOperationManager.Manager<Args, Result> {
    const version = config.version ?? constantVersion;
    let runIdCounter = 0;

    let lastRunPromise = Promise.resolve(
        null! as AsyncOperationManager.ManagedResult<Args, Result>,
    );

    const funcName = `${func.name}_operationManaged`;
    const mFunc1 = {
        [funcName]: async function (...args: Args) {
            const runId = (runIdCounter = incrementVersion(runIdCounter));
            config.addLoadingCounter?.(1);
            const result = { runId, args } as AsyncOperationManager.ManagedResult<
                Args,
                Result,
                "none"
            >;
            result.version = version("newRun", result);
            config.onEvent?.(result);
            forceType<AsyncOperationManager.ManagedResult<Args, Result>>(result);
            try {
                const data = await func(...args);
                forceProperty<"data">(result);
                result.data = data;
                result.kind = "data";
            } catch (error) {
                forceProperty<"error">(result);
                result.error = error;
                result.kind = "error";
            } finally {
                config.addLoadingCounter?.(-1);
            }

            if (result.version !== version("afterRun", result)) {
                result.expired = true;
            }

            config.onEvent?.(result);
            if (!result.expired) {
                forceType<{ expired?: undefined }>(result);
                if (result.kind === "data") {
                    config.onSuccess?.(result);
                } else {
                    config.onError?.(result);
                }
            }

            return result;
        },
    }[funcName]!;

    const mFunc = (...args: Args) => (lastRunPromise = mFunc1(...args));

    makeDisposable(mFunc, disposeProps.bind(undefined, config));

    return {
        action: mFunc,
        dispose: mFunc.dispose,
        lastRunPromise() {
            return lastRunPromise;
        },
        version,
        currentRunId() {
            return runIdCounter;
        },
    };
}

export namespace AsyncDataManager {
    export interface State<T> {
        data?: T;
        error?: unknown;
        isLoading: boolean;
    }

    export interface Config<Args extends any[], Result>
        extends AsyncOperationManager.Config<Args, Result> {
        initialIsLoading?: boolean;
        initialSetState?: boolean;
        onSuccess?: ((e: ManagedResult<Args, Result, "data"> & { expired?: undefined }) => void) &
            Disposable;
        onError?: ((e: ManagedResult<Args, Result, "error"> & { expired?: undefined }) => void) &
            Disposable;
        onEvent?: ((e: ManagedResult<Args, Result, "data" | "error" | "none">) => void) &
            Disposable;
    }

    export type ManagedResult<
        Args extends any[],
        Result,
        Kind extends "error" | "data" | "none" = "error" | "data",
    > = AsyncOperationManager.ManagedResult<Args, Result, Kind> & {
        loadingSuppressed?: true;
    };

    export type ManagedFunction<Args extends any[], Result> = ((
        ...args: Args
    ) => Promise<ManagedResult<Args, Result>>) &
        Disposable;

    export interface Manager<Args extends any[], Result> extends Disposable {
        refresh: ManagedFunction<Args, Result>;
        refreshWithoutLoading: ManagedFunction<Args, Result>;
        lastRunPromise(): Promise<ManagedResult<Args, Result>>;
        version: (d: "getCurrent" | "forceInvalidate") => number | string;
        currentRunId(): number;
    }
}

export function incrementalVersion(): VersionFunctionGr {
    let versionCounter = 0;
    return function version(t) {
        if (t === "newRun" || t === "forceInvalidate") {
            versionCounter = incrementVersion(versionCounter);
        }
        return versionCounter;
    };
}

export function asyncDataManager<Args extends any[], Result>(
    func: (...args: Args) => Result | Promise<Result>,
    setState: (state: AsyncDataManager.State<Result>) => void,
    config: AsyncDataManager.Config<Args, Result> = {},
): AsyncDataManager.Manager<Args, Result> {
    let state = asyncDataManager.initialState<Result>(config.initialIsLoading ?? false);
    let suppressLoading = false;

    if (config.initialSetState) {
        setState(state);
    }

    const m = asyncOperationManager(func, {
        ...config,
        version: config.version ?? incrementalVersion(),
        onEvent: combineDisposableVoidFunctions(function asyncDataManager_onEvent(e) {
            if (e.expired) {
                return;
            }
            if ("kind" in e) {
                if (e.kind === "data") {
                    state = { ...state, ...e, error: undefined, isLoading: false };
                    setState(state);
                } else if (!e.loadingSuppressed || state.isLoading) {
                    state = { ...state, ...e, isLoading: false };
                    setState(state);
                    e.loadingSuppressed = undefined;
                }
            } else if (suppressLoading && "data" in state && state.error === undefined) {
                e.loadingSuppressed = true;
            } else {
                state = { ...state, isLoading: true };
                setState(state);
            }
        }, config.onEvent),
    });

    return {
        refresh: m.action,
        lastRunPromise: m.lastRunPromise,
        refreshWithoutLoading(...args) {
            suppressLoading = true;
            const r = m.action(...args);
            suppressLoading = false;
            return r;
        },
        currentRunId: m.currentRunId,
        version: m.version,
        dispose: m.dispose,
    };
}

asyncDataManager.initialState = function asyncDataManager_initialState<T>(isLoading = false) {
    return { isLoading } as AsyncDataManager.State<T>;
};
