import { useElementSize } from "~/core/hooks/use-element-size";
import { useLayoutEffect } from "react";

export function useShrinkToFit(props: {
    element: HTMLElement | null;
    elementSize?: null | { width: number; height: number };
    minWidthEm?: number;
    minHeightEm?: number;
    defaultFontSize?: number;
}) {
    const elementSize =
        props.elementSize !== undefined
            ? props.elementSize
            : // eslint-disable-next-line react-hooks/rules-of-hooks
              useElementSize(props.element, "outer");

    useLayoutEffect(() => {
        if (props.element === null || elementSize === null) {
            return;
        }

        const em = props.defaultFontSize ?? 16;
        let fontSize: number | undefined;

        if (props.minWidthEm && elementSize.width <= props.minWidthEm * em) {
            fontSize = elementSize.width / props.minWidthEm;
        }
        if (props.minHeightEm && elementSize.height <= props.minHeightEm * em) {
            fontSize = Math.min(
                fontSize ?? Number.POSITIVE_INFINITY,
                elementSize.height / props.minHeightEm,
            );
        }

        props.element.style.fontSize = `${fontSize}px`;

        return () => {
            props.element!.style.fontSize = "";
        };
    }, [props.defaultFontSize, props.element, props.minHeightEm, props.minWidthEm, elementSize]);
}
