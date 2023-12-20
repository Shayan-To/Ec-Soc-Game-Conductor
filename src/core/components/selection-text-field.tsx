import { type TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { useForwardingRef } from "~/core/hooks/use-forwarding-ref";
import { forwardRef, useLayoutEffect, useRef } from "react";
import { TextField } from "./text-field";

export interface TextFieldSelection {
    value: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    selectionDirection: "forward" | "backward" | "none" | null;
}

export const selMarkerStart = "\uE010";
export const selMarkerEnd = "\uE011";
const removeMarkersRegex = new RegExp(`[${selMarkerStart}${selMarkerEnd}]`, "g");

export function convertSelectionObjToMarkers(selection: TextFieldSelection) {
    const [marker1, marker2] =
        selection.selectionDirection === "backward"
            ? [selMarkerEnd, selMarkerStart]
            : [selMarkerStart, selMarkerEnd];
    return (
        selection.value.substring(0, selection.selectionStart ?? 0) +
        marker1 +
        selection.value.substring(selection.selectionStart ?? 0, selection.selectionEnd ?? 0) +
        marker2 +
        selection.value.substring(selection.selectionEnd ?? 0)
    );
}

export function convertSelectionMarkersToObj(str: string): TextFieldSelection {
    const value = str.replace(removeMarkersRegex, "");

    let start = str.indexOf(selMarkerStart);
    let end = str.indexOf(selMarkerStart);

    if (start === -1 && end === -1) {
        return { value, selectionStart: null, selectionEnd: null, selectionDirection: null };
    }
    if (start === -1) {
        start = end;
    }
    if (end === -1) {
        end = start;
    }

    if (start <= end) {
        return { value, selectionStart: start, selectionEnd: end, selectionDirection: "forward" };
    } else {
        return { value, selectionStart: end, selectionEnd: start, selectionDirection: "backward" };
    }
}

export type SelectionTextFieldProps = MuiTextFieldProps & {
    version?: number | string;
    selectionValue?: string;
};

export const SelectionTextField = forwardRef<HTMLDivElement, SelectionTextFieldProps>(
    function SelectionTextField(props, ref) {
        const { inputRef: inputRefProp, selectionValue, value, ...restProps } = props;
        const inputRef = useForwardingRef<HTMLInputElement>(inputRefProp);
        const prevSelection = useRef<TextFieldSelection & { version?: number | string }>();

        const selection = convertSelectionMarkersToObj(selectionValue ?? "");

        useLayoutEffect(() => {
            const inp = inputRef.current;
            if (selection.selectionStart === null || inp === null) {
                prevSelection.current = undefined;
                return;
            }
            const pSelection = prevSelection.current;
            prevSelection.current = selection;
            prevSelection.current.version = props.version;
            if (pSelection !== undefined) {
                if (
                    pSelection.selectionStart === selection.selectionStart &&
                    pSelection.selectionEnd === selection.selectionEnd &&
                    pSelection.selectionDirection === selection.selectionDirection &&
                    pSelection.value === selection.value &&
                    pSelection.version === props.version
                ) {
                    return;
                }
            }
            if (
                inp.selectionStart === selection.selectionStart &&
                inp.selectionEnd === selection.selectionEnd &&
                (inp.selectionDirection ?? "none") === (selection.selectionDirection ?? "none")
            ) {
                return;
            }
            inp.setSelectionRange(
                selection.selectionStart,
                selection.selectionEnd,
                selection.selectionDirection ?? undefined,
            );
        });

        return (
            <TextField
                ref={ref}
                inputRef={inputRef}
                value={selectionValue === undefined ? value : selection.value}
                {...restProps}
            />
        );
    },
);
