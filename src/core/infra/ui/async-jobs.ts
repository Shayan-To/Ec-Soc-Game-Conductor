import { delay, identity, incrementVersion } from "~/core/utils";
import { combineDisposableVoidFunctions, type Disposable } from "~/core/utils/disposables";
import { type ParamHolder2, type UnholdParam1, type UnholdParam2 } from "~/core/utils/type-gen-utils";
import { createExactObjectOf } from "~/core/utils/type-utils";
import { Deferred } from "../deferred";
import {
    asyncDataManager,
    type AsyncDataManager,
    asyncOperationManager,
    type AsyncOperationManager,
} from "./async-managers";

export interface JobTypeHolderBase {
    manager: any;
    inputArgs: any[];
}

export type UnholdArgs<This extends JobTypeHolderBase> = UnholdParam1<This> & any[];
export type UnholdResult<This extends JobTypeHolderBase> = UnholdParam2<This>;

type UnholdManager<Holder extends JobTypeHolderBase, Args extends any[], Result> = (Holder &
    ParamHolder2<Args, Result>)["manager"];
type UnholdInputArgs<Holder extends JobTypeHolderBase, Args extends any[], Result> = (Holder &
    ParamHolder2<Args, Result>)["inputArgs"];

export interface JobAdapter<Holder extends JobTypeHolderBase> {
    createManager<Args extends any[], Result>(
        continueHook: <
            Listener extends (e: AsyncOperationManager.ManagedResult<Args, Result>) => void,
        >(
            listener?: Listener & Disposable,
        ) => Listener & Disposable,
        ...inputArgs: UnholdInputArgs<Holder, Args, Result>
    ): { manager: UnholdManager<Holder, Args, Result>; config: AsyncJob.Config<Args, Result> };

    action<Args extends any[], Result>(
        manager: UnholdManager<Holder, Args, Result>,
        args: Args,
    ): void;
    version<Args extends any[], Result>(
        manager: UnholdManager<Holder, Args, Result>,
        d: "getCurrent" | "forceInvalidate",
    ): number | string;
    currentRunId<Args extends any[], Result>(manager: UnholdManager<Holder, Args, Result>): number;
}

export const createJobAdapter = identity as <Holder extends JobTypeHolderBase>(
    adapter: JobAdapter<Holder>,
) => JobAdapter<Holder>;

interface ShouldContinueData {
    isJobRunning: boolean;
    lastJobRunId: number;
    currentRunId: number;
    lastJobVersion: number | string;
    currentVersion: number | string;
}

export type ShouldContinueJobFunction<Args extends any[], Result> = (
    d: ShouldContinueData & AsyncOperationManager.ManagedResult<Args, Result>,
) => boolean;

export type DelayFunction = (prevCallTime: number, now: number) => number | false;

export namespace AsyncJob {
    export interface Config<Args extends any[], Result> {
        delay: number | DelayFunction;
        shouldContinue?: ShouldContinueJobFunction<Args, Result>;
    }

    export interface Manager<Args extends any[], Manager> extends Disposable {
        start(...args: Args): void;
        cancel(): void;
        manager: Manager;
    }
}

export const shouldContinueFunctions = createExactObjectOf<
    <Args extends any[], Result>(
        d: ShouldContinueData &
            AsyncOperationManager.ManagedResult<Args, Result, "data" | "error" | "none">,
    ) => boolean
>()({
    haltOnError(d) {
        return (
            d.isJobRunning &&
            !d.expired &&
            d.runId === d.currentRunId &&
            "kind" in d &&
            d.kind === "data"
        );
    },
    continueOnError(d) {
        return d.isJobRunning && !d.expired && d.runId === d.currentRunId && "kind" in d;
    },
});

export function boundedDelay(spacing: number, minDelay: number): DelayFunction {
    return function boundedDelay(prevCallTime, now) {
        return Math.max(spacing - (now - prevCallTime), minDelay);
    };
}

export function asyncJob<Holder extends JobTypeHolderBase>(adapter: JobAdapter<Holder>) {
    return function asyncJob<Args extends any[], Result>(
        ...inputArgs: UnholdInputArgs<Holder, Args, Result>
    ): AsyncJob.Manager<Args, UnholdManager<Holder, Args, Result>> {
        const { manager, config } = adapter.createManager(function continueHook(listener) {
            return combineDisposableVoidFunctions(
                function asyncJob_continueHook(e) {
                    if (
                        shouldContinue({
                            ...e,
                            isJobRunning,
                            lastJobRunId,
                            lastJobVersion,
                            currentRunId: adapter.currentRunId(manager),
                            currentVersion: adapter.version(manager, "getCurrent"),
                        })
                    ) {
                        const now = performance.now();

                        const delayMs =
                            typeof config.delay === "number"
                                ? config.delay
                                : config.delay(lastJobCallTime, now);

                        if (delayMs === false) {
                            isJobRunning = false;
                            task = null;
                        } else {
                            task = { at: now + delayMs, parentRunId: e.runId };
                            loopWait.resolve();
                        }
                    }
                } as typeof listener,
                listener,
            )!;
        }, ...inputArgs);

        const shouldContinue = config.shouldContinue ?? shouldContinueFunctions.haltOnError;

        let isJobRunning = false;
        let lastJobRunId = 0;
        let lastJobVersion = 0 as string | number;
        let lastJobCallTime = 0;

        let task: { at: number; parentRunId: number | string } | null = null;
        let loopVersion = 0;
        let loopWait = new Deferred<void>();

        function newLoopWait() {
            loopWait.resolve();
            loopWait = new Deferred();
            return loopWait.promise;
        }

        async function loop(args: Args) {
            const version = (loopVersion = incrementVersion(loopVersion));
            while (version === loopVersion) {
                if (task === null) {
                    await newLoopWait();
                    continue;
                }

                const now = performance.now();
                if (now < task.at) {
                    await Promise.race([newLoopWait(), delay(task.at - now)]);
                    continue;
                }

                adapter.action(manager, args);
                lastJobCallTime = now;
                lastJobRunId = adapter.currentRunId(manager);
                lastJobVersion = adapter.version(manager, "getCurrent");

                task = null;
            }
        }

        function cancel() {
            isJobRunning = false;
            adapter.version(manager, "forceInvalidate");
            loopVersion = incrementVersion(loopVersion);
            loopWait.resolve();
        }

        return {
            start(...args: Args) {
                isJobRunning = true;
                task = { at: 0, parentRunId: "start" };
                loop(args);
            },
            cancel,
            dispose() {
                cancel();
                (manager as Disposable).dispose?.();
            },
            manager: manager,
        };
    };
}

export interface AsyncOperationJobConfig<Args extends any[], Result>
    extends AsyncOperationManager.Config<Args, Result>,
        AsyncJob.Config<Args, Result> {}

interface AsyncOperationJobTypeHolder extends JobTypeHolderBase {
    manager: AsyncOperationManager.Manager<UnholdArgs<this>, UnholdResult<this>>;
    inputArgs: [
        func: (...args: UnholdArgs<this>) => UnholdResult<this> | Promise<UnholdResult<this>>,
        config: AsyncOperationJobConfig<UnholdArgs<this>, UnholdResult<this>>,
    ];
}

const asyncOperationJobAdapter = createJobAdapter<AsyncOperationJobTypeHolder>({
    createManager(continueHook, func, config) {
        return {
            manager: asyncOperationManager(func, {
                ...config,
                onEvent: continueHook(config.onEvent),
            }),
            config,
        };
    },
    action(manager, args) {
        return manager.action(...args);
    },
    currentRunId(manager) {
        return manager.currentRunId();
    },
    version(manager, d) {
        return manager.version(d);
    },
});

export const asyncOperationJob = asyncJob(asyncOperationJobAdapter);

interface AsyncDataJobExtraConfig {
    withoutLoading?: boolean;
}

export interface AsyncDataJobConfig<Args extends any[], Result>
    extends AsyncDataManager.Config<Args, Result>,
        AsyncJob.Config<Args, Result>,
        AsyncDataJobExtraConfig {}

interface AsyncDataJobTypeHolder extends JobTypeHolderBase {
    manager: AsyncDataManager.Manager<UnholdArgs<this>, UnholdResult<this>> &
        AsyncDataJobExtraConfig;
    inputArgs: [
        func: (...args: UnholdArgs<this>) => UnholdResult<this> | Promise<UnholdResult<this>>,
        setState: (state: AsyncDataManager.State<UnholdResult<this>>) => void,
        config: AsyncDataJobConfig<UnholdArgs<this>, UnholdResult<this>>,
    ];
}

const asyncDataJobAdapter = createJobAdapter<AsyncDataJobTypeHolder>({
    createManager(continueHook, func, setState, config) {
        return {
            manager: {
                ...asyncDataManager(func, setState, {
                    ...config,
                    onEvent: continueHook(config.onEvent),
                }),
                withoutLoading: config.withoutLoading,
            },
            config,
        };
    },
    action(manager, args) {
        return (manager.withoutLoading ? manager.refreshWithoutLoading : manager.refresh)(...args);
    },
    currentRunId(manager) {
        return manager.currentRunId();
    },
    version(manager, d) {
        return manager.version(d);
    },
});

export const asyncDataJob = asyncJob(asyncDataJobAdapter);
