import { TextField as MuiTextField, type TextFieldProps } from "@mui/material";
import { forwardRef } from "react";

export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(function TextField(props, ref) {
    return (
        <MuiTextField
            ref={ref}
            {...props}
            autoFocus={false} // ToDo Maybe check https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API
        />
    );
});
