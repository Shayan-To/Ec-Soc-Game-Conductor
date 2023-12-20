import { type TextFieldProps } from "@mui/material";
import { useInitRef, usePropsRef } from "~/core/hooks";
import { useForwardingRef } from "~/core/hooks/use-forwarding-ref";
import { delocalizeDigits, localizeDigits } from "~/core/utils/i18n-utils";
import { type ChangeEvent, forwardRef, useLayoutEffect } from "react";
import {
    convertSelectionMarkersToObj,
    convertSelectionObjToMarkers,
    SelectionTextField,
    type TextFieldSelection,
} from "./selection-text-field";

export interface TextFormatter {
    getRawText?(s: string): string;
    getFormattedText(s: string): string;
}

export type AdvancedTextFieldProps = Omit<TextFieldProps, "value" | "onChange"> & {
    textFormatter?: TextFormatter;
    useLatinDigits?: boolean;
    value: string;
    onValueChange?: (d: TextFieldSelection, e: ChangeEvent<HTMLInputElement>) => void;
};

export const AdvancedTextField = forwardRef<HTMLDivElement, AdvancedTextFieldProps>(
    function AdvancedTextField(iProps, ref) {
        const inputRef = useForwardingRef<HTMLInputElement>(iProps.inputRef);
        const props = usePropsRef(iProps);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { textFormatter, useLatinDigits, value, onValueChange, ...restProps } = props;

        const f = useInitRef(() => ({
            onChange(e: ChangeEvent<HTMLInputElement>) {
                const value = delocalizeDigits(convertSelectionObjToMarkers(e.target));
                const rawValue = props.textFormatter
                    ? (props.textFormatter.getRawText ?? props.textFormatter.getFormattedText)(
                          value,
                      )
                    : value;
                const selData = convertSelectionMarkersToObj(rawValue);
                f.selectionMap[selData.value] = rawValue;
                props.onValueChange?.(selData, e);
            },
            selectionMap: {} as Record<string, string | undefined>,
            selectionMapOld: {} as Record<string, string | undefined>,
        }));

        useLayoutEffect(() => {
            const newMap = { [value]: f.selectionMap[value] ?? f.selectionMapOld[value] };
            f.selectionMapOld = f.selectionMap;
            f.selectionMap = newMap;
        });

        const selValue = f.selectionMap[value] ?? f.selectionMapOld[value] ?? value;
        const fValue = textFormatter?.getFormattedText(selValue) ?? selValue;

        return (
            <SelectionTextField
                ref={ref}
                onChange={f.onChange}
                selectionValue={useLatinDigits ? fValue : localizeDigits(fValue)}
                {...restProps}
                inputRef={inputRef}
            />
        );
    },
);
