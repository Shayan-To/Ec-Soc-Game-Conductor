import {
    SnackbarProvider as BaseSnackbarProvider,
    type SnackbarProviderProps as BaseSnackbarProviderProps,
    type ProviderContext as SnackbarProviderContext,
} from "notistack";
import React from "react";
import { Service } from "./service";

export const snackbarService = new Service<SnackbarProviderContext | null>("snackbar", null);
// bind to use in ref in SnackbarProvider
snackbarService.setValue = snackbarService.setValue.bind(snackbarService);

export const snackbar = {
    closeSnackbar(...args: Parameters<SnackbarProviderContext["closeSnackbar"]>) {
        return snackbarService.getValue()?.closeSnackbar(...args);
    },
    enqueueSnackbar(...args: Parameters<SnackbarProviderContext["enqueueSnackbar"]>) {
        const r = snackbarService.getValue()?.enqueueSnackbar(...args);
        return r;
    },
};

export function SnackbarProvider(props: SnackbarProviderProps) {
    return React.createElement(BaseSnackbarProvider, {
        ...props,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: snackbarService.setValue,
    });
}

export type SnackbarProviderProps = Pick<
    BaseSnackbarProviderProps,
    | "anchorOrigin"
    | "autoHideDuration"
    | "preventDuplicate"
    | "dense"
    | "maxSnack"
    | "hideIconVariant"
    | "iconVariant"
    | "TransitionComponent"
    | "TransitionProps"
    | "transitionDuration"
    | "children"
>;
