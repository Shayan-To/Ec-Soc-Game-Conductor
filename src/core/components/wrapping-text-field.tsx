import { type TextFieldProps } from "@mui/material";
import { useInitRef, usePropsRef } from "~/core/hooks";
import { omitFromObject } from "~/core/utils";
import { type TypedOmit, type UnRef } from "~/core/utils/type-utils";
import { type ComponentType, forwardRef } from "react";
import { AdvancedTextField } from "./advanced-text-field";
import { TextField } from "./text-field";

export function createWrappingTextField<
    Props extends Pick<TextFieldProps, "multiline" | "onKeyDown" | "ref">,
>(textFieldComponent: ComponentType<Props>) {
    return forwardRef<UnRef<Props["ref"]>, TypedOmit<Props, "multiline"> & { wrap?: boolean }>(
        function WrappingTextField(iProps, ref) {
            const props = usePropsRef(iProps);

            const f = useInitRef(() => ({
                keyDown: function keyDown(e) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        if (!e.repeat) {
                            const submitEvent = new Event("submit", {
                                cancelable: true,
                                bubbles: true,
                            });
                            (e.target as HTMLInputElement).form?.dispatchEvent(submitEvent);
                        }
                        return;
                    }
                    props.onKeyDown?.(e);
                } satisfies TextFieldProps["onKeyDown"],
            }));

            const TextField = textFieldComponent ;

            return (
                <TextField
                    ref={ref}
                    {...(omitFromObject(props, "wrap") as any as Props)}
                    onKeyDown={props.wrap ? f.keyDown : props.onKeyDown}
                    multiline={props.wrap}
                />
            );
        },
    );
}

export const WrappingTextField = createWrappingTextField(TextField);
export const AdvancedWrappingTextField = createWrappingTextField(AdvancedTextField);
