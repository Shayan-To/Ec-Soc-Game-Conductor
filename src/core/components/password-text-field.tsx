import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { IconButton, type TextFieldProps } from "@mui/material";
import clsx from "clsx";
import { useEffectEvery, useToggler } from "~/core/hooks";
import { useForwardingRef } from "~/core/hooks/use-forwarding-ref";
import { type UnRef } from "~/core/utils/type-utils";
import { type ComponentType, forwardRef, useRef } from "react";
import { TextField } from "./text-field";
import { WrappingTextField } from "./wrapping-text-field";

export function createPasswordTextField<
    Props extends Pick<
        TextFieldProps,
        "InputProps" | "inputProps" | "value" | "type" | "inputRef" | "ref"
    >,
>(textFieldComponent: ComponentType<Props>) {
    return forwardRef<
        UnRef<Props["ref"]>,
        Props & {
            maskBased?: (maskPassword: boolean) => Partial<Props> | false | null | undefined;
        }
    >(function PasswordTextField(iProps, ref) {
        const [maskPassword, toggleMaskPassword] = useToggler(true);
        const { maskBased, ...propsO } = iProps;
        const props = maskBased
            ? {
                  ...propsO,
                  ...maskBased(maskPassword),
              }
            : propsO;
        const inputRef = useForwardingRef<HTMLInputElement>(props.inputRef);

        const prevMaskPassword = useRef(maskPassword);
        useEffectEvery(() => {
            if (prevMaskPassword.current !== maskPassword) {
                inputRef.current?.focus();
            }
            prevMaskPassword.current = maskPassword;
        });

        const TextField = textFieldComponent ;

        return (
            <TextField
                ref={ref}
                {...(props as Props)}
                InputProps={{
                    ...props.InputProps,
                    startAdornment:
                        props.value === "" ? (
                            props.InputProps?.startAdornment
                        ) : (
                            <>
                                {props.InputProps?.startAdornment}
                                <IconButton
                                    className="margin-e-1"
                                    size="small"
                                    onClick={toggleMaskPassword}
                                    tabIndex={-1}
                                >
                                    {maskPassword ? (
                                        <VisibilityOffIcon fontSize="small" />
                                    ) : (
                                        <VisibilityIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </>
                        ),
                }}
                inputProps={{
                    ...props.inputProps,
                    className: clsx(props.inputProps?.className, "ltr"),
                }}
                {...(maskPassword && { type: "password" })}
                inputRef={inputRef}
            />
        );
    });
}

export const PasswordTextField = createPasswordTextField(TextField);
export const WrappingPasswordTextField = createPasswordTextField(WrappingTextField);
