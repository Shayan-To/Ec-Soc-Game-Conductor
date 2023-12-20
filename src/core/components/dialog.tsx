import { Dialog as MuiDialog, type DialogProps } from "@mui/material";
import { useRenderBasedRef } from "~/core/hooks";
import { forwardRef } from "react";

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(props, ref) {
    const lastProps = useRenderBasedRef(() => props);

    if (props.open) {
        lastProps.current = props;
    }

    return <MuiDialog {...lastProps.current} open={props.open} ref={ref} />;
});
