import { type StateGetters } from "~/core/hooks";
import { type AsyncDataManager } from "~/core/infra/ui/async-managers";
import {
    asyncDataManagerWithSnackbar,
    asyncOperationManagerWithSnackbar,
    type AsyncDataManagerWithSnackbarConfig,
    type AsyncOperationManagerWithSnackbarConfig,
} from "~/core/infra/ui/snackbar-handlers";
import { makeDisposable } from "./disposables";
import { type KeysOfType } from "./type-utils";

export function asyncOperation<State extends object, Args extends any[], Output>(
    state: StateGetters<State> | null,
    action: (cState: State, ...args: Args) => Output | Promise<Output>,
    cfg: AsyncOperationManagerWithSnackbarConfig<[State, ...Args], Output> & {
        validator?: (cState: State) => boolean;
        onBefore?: () => void;
    } = {},
) {
    const m = asyncOperationManagerWithSnackbar(action, cfg);
    async function asyncOperation(...args: Args) {
        cfg.onBefore?.();
        const cState = (await state?.currentState) ?? ({} as State);
        if (cfg.validator && !cfg.validator(cState)) {
            return;
        }
        return await m.action(cState, ...args);
    }
    asyncOperation.config = cfg;
    makeDisposable(asyncOperation, m.dispose);
    return asyncOperation;
}

export function asyncData<State extends object, Args extends any[], Output>(
    state: StateGetters<State> & State,
    prop: KeysOfType<State, AsyncDataManager.State<Output>>,
    action: (cState: State, ...args: Args) => Output | Promise<Output>,
    cfg: AsyncDataManagerWithSnackbarConfig<[State, ...Args], Output> & {
        validator?: (cState: State) => boolean;
        onBefore?: () => void;
        withoutLoading?: boolean;
    } = {},
) {
    const m = asyncDataManagerWithSnackbar(
        action,
        (v) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            state[prop] = v as any;
        },
        cfg,
    );
    async function asyncData(...args: Args) {
        cfg.onBefore?.();
        const withoutLoading = cfg.withoutLoading;
        const cState = await state.currentState;
        if (cfg.validator && !cfg.validator(cState)) {
            return;
        }
        return await (withoutLoading ? m.refreshWithoutLoading : m.refresh)(cState, ...args);
    }
    asyncData.config = cfg;
    makeDisposable(asyncData, m.dispose);
    return asyncData;
}
