import clsx from "clsx";
import { useInitRef, usePropsRef } from "~/core/hooks";
import { type AsyncDataManager } from "~/core/infra/ui/async-managers";
import { type WithSnackbarConfig } from "~/core/infra/ui/snackbar-handlers";
import { identity } from "~/core/utils";
import { type ReactNode } from "react";

export function EdgeCaseHandler(iProps: {
    children?: ReactNode;
    state: AsyncDataManager.State<any>;
    args?: any[];
    isEmpty?: boolean | ((state: AsyncDataManager.State<any>) => boolean);
    loadingMessage?: ReactNode;
    loadingContainer?: (message: ReactNode) => ReactNode;
    errorMessage?: WithSnackbarConfig<any[], any>["errorMessage"];
    errorContainer?: (message: ReactNode, retry: () => void) => ReactNode;
    emptyMessage?: ReactNode;
    emptyContainer?: (message: ReactNode) => ReactNode;
    edgeCaseContainer?: (children: ReactNode) => ReactNode;
    retry?: (...args: any[]) => void;
}) {
    const props = usePropsRef(iProps);
    const f = useInitRef(() => ({
        retry() {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            props.retry?.(...(props.args ?? []));
        },
    }));
    const isEmpty =
        typeof props.isEmpty === "function" ? props.isEmpty(props.state) : props.isEmpty ?? false;
    const isEdgeCase = props.state.isLoading || props.state.error !== undefined || isEmpty;
    return (
        <>
            {isEdgeCase &&
                (props.edgeCaseContainer ?? identity)(
                    <>
                        {props.state.isLoading &&
                            (props.loadingContainer ?? identity)(props.loadingMessage)}
                        {!props.state.isLoading &&
                            props.state.error !== undefined &&
                            (props.errorContainer ?? identity)(
                                typeof props.errorMessage === "function"
                                    ? props.errorMessage(props.state.error, {
                                          args: props.args ?? [],
                                          error: props.state.error,
                                          ...props.state,
                                      })
                                    : props.errorMessage,
                                f.retry,
                            )}
                        {!props.state.isLoading &&
                            props.state.error === undefined &&
                            isEmpty &&
                            (props.emptyContainer ?? identity)(props.emptyMessage)}
                    </>,
                )}
            <div className={clsx(isEdgeCase && "hidden")}>{props.children}</div>
        </>
    );
}
