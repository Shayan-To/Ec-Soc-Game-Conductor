import { Button } from "@mui/material";
import { combineDisposableVoidFunctions, type Disposable, makeDisposable } from "~/core/utils/disposables";
import { preventDefault } from "~/core/utils/react-utils";
import React, { type ReactNode } from "react";
import { showSnackbar } from "../snackbar";
import {
    asyncDataJob,
    type AsyncDataJobConfig,
    asyncOperationJob,
    type AsyncOperationJobConfig,
} from "./async-jobs";
import {
    asyncDataManager,
    type AsyncDataManager,
    asyncOperationManager,
    type AsyncOperationManager,
} from "./async-managers";

type SnackbarHandlerMode = "normal" | "noAction" | "noPersist" | "noActionNoPersist" | "inactive";

interface SnackbarHandler<Args extends any[] = []> {
    handler(...args: Args): void;
    setMode(mode: SnackbarHandlerMode): void;
    closeSnackbars(mode: "persistents" | "nonPersistents"): void;
}

export function snackbarHandler<
    SnackbarConfig extends {
        message: ReactNode;
        variant: "default" | "error" | "success" | "warning" | "info";
        action?: ReactNode;
        persist?: boolean;
    },
    Args extends any[] = [],
>(cfg: {
    retry?: (...args: Args) => void;
    onlyLatest?: boolean;
    retryButtonLabel?: ReactNode;
    showSnackbar: (config: SnackbarConfig) => () => void;
    snackbar: SnackbarConfig | ((...args: Args) => SnackbarConfig | undefined);
    modeOverride?: () => SnackbarHandlerMode | undefined;
}) {
    const closeActions = {
        persistents: [] as (() => void)[],
        nonPersistents: [] as (() => void)[],
    };
    let mode: SnackbarHandlerMode = "normal";

    function snackbarHandler(...args: Args) {
        const cMode = cfg.modeOverride?.() ?? mode;
        if (cMode === "inactive") {
            return;
        }

        const config = typeof cfg.snackbar === "function" ? cfg.snackbar(...args) : cfg.snackbar;
        if (config === undefined) {
            return;
        }

        if (cfg.retry !== undefined && cMode !== "noAction" && cMode !== "noActionNoPersist") {
            config.action = React.createElement(
                Button,
                {
                    onClick: preventDefault(() => {
                        close();
                        return cfg.retry!(...args);
                    }),
                    variant: "text",
                    color: "inherit",
                },
                cfg.retryButtonLabel ?? "تلاش مجدد",
            );
        }
        if (cfg.onlyLatest) {
            closeSnackbars("persistents");
            closeSnackbars("nonPersistents");
        }
        if (config.persist && (cMode === "noPersist" || cMode === "noActionNoPersist")) {
            config.persist = false;
        }

        const close = cfg.showSnackbar(config);
        if (close !== undefined) {
            if (config.persist) {
                closeActions.persistents.push(close);
            } else {
                closeActions.nonPersistents.push(close);
            }
        }
    }
    function closeSnackbars(mode: "persistents" | "nonPersistents") {
        const l = closeActions[mode];
        l.splice(0, l.length).forEach((c) => c());
    }
    function setMode(v: SnackbarHandlerMode) {
        mode = v;
    }
    return {
        handler: snackbarHandler,
        setMode,
        closeSnackbars,
    };
}

type CloseMode = "none" | "persistents" | "all";
type HandlerDisposeMethod = `close${Capitalize<CloseMode>}${`-${SnackbarHandlerMode}Mode` | ""}`;

function snackbarHandlerAddDispose<Handler extends SnackbarHandler<any[]>>(
    h: Handler,
    disposeMethod: HandlerDisposeMethod,
): Handler & Disposable {
    const [closeMode, mode] = disposeMethod.split("-") as [
        `close${Capitalize<CloseMode>}`,
        `${SnackbarHandlerMode}Mode` | undefined,
    ];
    makeDisposable(h, function dispose() {
        if (closeMode === "closePersistents") {
            h.closeSnackbars("persistents");
        }
        if (closeMode === "closeAll") {
            h.closeSnackbars("nonPersistents");
        }
        if (mode !== undefined) {
            h.setMode(mode.replace(/Mode$/, "") as SnackbarHandlerMode);
        }
    });
    return h;
}

export interface WithSnackbarBaseConfig<Args extends any[], Result> {
    onSuccess?: ((e: { args: Args; data: Result }) => void) & Disposable;
    onError?: ((e: { args: Args; error: unknown }) => void) & Disposable;
}

export interface WithSnackbarConfig<Args extends any[], Result> {
    successMessage?:
        | ReactNode
        | ((data: Result, e: { args: Args; data: Result }) => ReactNode | undefined);
    successDisposeMethod?: HandlerDisposeMethod;
    errorMessage?:
        | ReactNode
        | ((error: unknown, e: { args: Args; error: unknown }) => ReactNode | undefined);
    errorDisposeMethod?: HandlerDisposeMethod;
    retryMode?: "noRetry" | "retry" | "noTimeout"; // = "noRetry"
}

type BCfg<Args extends any[], Result> = Required<WithSnackbarBaseConfig<Args, Result>>;

export function applyWithSnackbarConfig<Args extends any[], Result>(
    baseConfig: WithSnackbarBaseConfig<Args, Result>,
    config: WithSnackbarConfig<Args, Result>,
    retry: (...args: Parameters<BCfg<Args, Result>["onError"]>) => void,
) {
    const r: {
        successHandler?: SnackbarHandler<Parameters<BCfg<Args, Result>["onSuccess"]>> & Disposable;
        errorHandler?: SnackbarHandler<Parameters<BCfg<Args, Result>["onError"]>> & Disposable;
    } = {};

    if (config.successMessage !== undefined) {
        r.successHandler = snackbarHandler({
            showSnackbar,
            snackbar: (e) => {
                const message =
                    typeof config.successMessage === "function"
                        ? config.successMessage(e.data, e)
                        : config.successMessage;
                if (message === undefined) {
                    return undefined;
                }
                return {
                    message,
                    variant: "success",
                };
            },
        });
        if (config.successDisposeMethod !== undefined) {
            snackbarHandlerAddDispose(r.successHandler, config.successDisposeMethod);
        }
        makeDisposable(r.successHandler.handler, () => r.successHandler!.dispose?.());
        baseConfig.onSuccess = combineDisposableVoidFunctions(
            r.successHandler.handler,
            baseConfig.onSuccess,
        );
    }

    if (config.errorMessage !== undefined) {
        r.errorHandler = snackbarHandler({
            showSnackbar,
            snackbar: (e) => {
                const message =
                    typeof config.errorMessage === "function"
                        ? config.errorMessage(e.error, e)
                        : config.errorMessage;
                if (message === undefined) {
                    return undefined;
                }
                return {
                    message,
                    variant: "error",
                    persist: config.retryMode === "noTimeout",
                };
            },
            onlyLatest: true,
            retry:
                config.retryMode === "retry" || config.retryMode === "noTimeout"
                    ? retry
                    : undefined,
        });
        if (config.errorDisposeMethod !== undefined) {
            snackbarHandlerAddDispose(r.errorHandler, config.errorDisposeMethod);
        }
        makeDisposable(r.errorHandler.handler, () => r.errorHandler!.dispose?.());
        baseConfig.onError = combineDisposableVoidFunctions(
            r.errorHandler.handler,
            baseConfig.onError,
        );
    }

    return r;
}

export interface AsyncOperationManagerWithSnackbarConfig<Args extends any[], Result>
    extends AsyncOperationManager.Config<Args, Result>,
        WithSnackbarConfig<Args, Result> {}

export function asyncOperationManagerWithSnackbar<Args extends any[], Result>(
    func: (...args: Args) => Result | Promise<Result>,
    config: AsyncOperationManagerWithSnackbarConfig<Args, Result> = {},
) {
    config.errorDisposeMethod ??= "closePersistents-noActionNoPersistMode";
    const h = applyWithSnackbarConfig(
        config as Parameters<typeof applyWithSnackbarConfig>[0],
        config,
        (e) => m.action(...e.args),
    );
    const m = asyncOperationManager(func, config);
    return { ...m, ...h };
}

export interface AsyncDataManagerWithSnackbarConfig<Args extends any[], Result>
    extends AsyncDataManager.Config<Args, Result>,
        WithSnackbarConfig<Args, Result> {}

export function asyncDataManagerWithSnackbar<Args extends any[], Result>(
    func: (...args: Args) => Result | Promise<Result>,
    setState: (state: AsyncDataManager.State<Result>) => void,
    config: AsyncDataManagerWithSnackbarConfig<Args, Result> = {},
) {
    config.successDisposeMethod ??= "closeAll-inactiveMode";
    config.errorDisposeMethod ??= "closePersistents-inactiveMode";
    const h = applyWithSnackbarConfig(
        config as Parameters<typeof applyWithSnackbarConfig>[0],
        config,
        (e) =>
            ((e as AsyncDataManager.ManagedResult<Args, Result>).loadingSuppressed
                ? m.refreshWithoutLoading
                : m.refresh)(...e.args),
    );
    const m = asyncDataManager(func, setState, config);
    return { ...m, ...h };
}

export interface AsyncOperationJobWithSnackbarConfig<Args extends any[], Result>
    extends AsyncOperationJobConfig<Args, Result>,
        WithSnackbarConfig<Args, Result> {}

export function asyncOperationJobWithSnackbar<Args extends any[], Result>(
    func: (...args: Args) => Result | Promise<Result>,
    config: AsyncOperationJobWithSnackbarConfig<Args, Result>,
) {
    config.errorDisposeMethod ??= "closePersistents-noActionNoPersistMode";
    const h = applyWithSnackbarConfig(
        config as Parameters<typeof applyWithSnackbarConfig>[0],
        config,
        (e) => m.start(...e.args),
    );
    const m = asyncOperationJob(func, config);
    const nm: typeof m = {
        ...m,
        cancel() {
            m.cancel.apply(this);
            h.errorHandler?.dispose?.();
        },
        start(...args) {
            m.start.apply(this, args);
            h.errorHandler?.setMode("normal");
        },
    };
    return { ...nm, ...h };
}

export interface AsyncDataJobWithSnackbarConfig<Args extends any[], Result>
    extends AsyncDataJobConfig<Args, Result>,
        WithSnackbarConfig<Args, Result> {}

export function asyncDataJobWithSnackbar<Args extends any[], Result>(
    func: (...args: Args) => Result | Promise<Result>,
    setState: (state: AsyncDataManager.State<Result>) => void,
    config: AsyncDataJobWithSnackbarConfig<Args, Result>,
) {
    config.successDisposeMethod ??= "closeAll-inactiveMode";
    config.errorDisposeMethod ??= "closePersistents-inactiveMode";
    const h = applyWithSnackbarConfig(
        config as Parameters<typeof applyWithSnackbarConfig>[0],
        config,
        (e) => m.start(...e.args),
    );
    const m = asyncDataJob(func, setState, config);
    const nm: typeof m = {
        ...m,
        cancel() {
            m.cancel.apply(this);
            h.errorHandler?.dispose?.();
        },
        start(...args) {
            m.start.apply(this, args);
            h.errorHandler?.setMode("normal");
        },
    };
    return { ...nm, ...h };
}
