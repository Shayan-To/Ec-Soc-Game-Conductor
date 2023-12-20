import { type OptionsObject as SnackbarOptionsObject, type SnackbarMessage } from "notistack";
import { snackbar } from "./snackbar-service";

export function showSnackbar(cfg: SnackbarConfig) {
    const key = snackbar.enqueueSnackbar(cfg.message, cfg);
    return () => {
        if (key !== undefined) {
            snackbar.closeSnackbar(key);
        }
    };
}

export type SnackbarConfig = Pick<
    SnackbarOptionsObject,
    "autoHideDuration" | "variant" | "action" | "key" | "persist"
> & { message: SnackbarMessage };
