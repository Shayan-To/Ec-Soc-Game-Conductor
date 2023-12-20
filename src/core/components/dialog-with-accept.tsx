import { type DialogProps } from "@mui/material";
import { Dialog } from "~/core/components/dialog";
import { useInitRef, usePropsRef } from "~/core/hooks";

export default function DialogWithAccept(iProps: DialogProps & { onAccept?: () => void }) {
    const props = usePropsRef(iProps);

    const f = useInitRef(() => ({
        keyDown: function keyDown(e) {
            if (e.key === "Enter") {
                e.stopPropagation();
                e.preventDefault();
                props.onAccept?.();
                return;
            }
            props.onKeyDown?.(e);
        } satisfies DialogProps["onKeyDown"],
    }));

    return <Dialog {...props} onKeyDown={f.keyDown} />;
}
