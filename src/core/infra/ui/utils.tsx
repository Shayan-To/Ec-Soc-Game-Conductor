import { type ReactNode } from "react";
import { type AsyncDataManager } from "./async-managers";

export function messageWithHeader<Args extends any[] = []>(
    header: ReactNode,
    message: undefined | ReactNode | ((...args: Args) => ReactNode | undefined),
) {
    return function messageWithHeader(...args: Args) {
        const msg = typeof message === "function" ? message(...args) : message;
        if (msg === undefined) {
            return;
        }
        return (
            <>
                {header}
                <br />
                {msg}
            </>
        );
    };
}

export function errorMessageWhenSuppressed<Args extends any[] = []>(
    message: undefined | ReactNode | ((...args: Args) => ReactNode | undefined),
) {
    return function errorMessageWhenSuppressed(...args: Args) {
        const e: AsyncDataManager.ManagedResult<[], void> = args[1];
        if (!e.loadingSuppressed) {
            return;
        }
        return typeof message === "function" ? message(...args) : message;
    };
}
