import clsx from "clsx";
import { useElRef } from "~/core/hooks";
import { useElementSize } from "~/core/hooks/use-element-size";
import { type CSSProperties, type ReactNode } from "react";

export function FixedGrowthContainer(props: {
    outerClassName?: string;
    outerStyle?: CSSProperties;
    innerClassName?: string;
    innerStyle?: CSSProperties;
    fixedDimension: "width" | "height";
    children?: ReactNode;
}) {
    const inner = useElRef();
    const innerSize = useElementSize(inner, "outer");

    return (
        <div
            className={clsx("relative", props.outerClassName)}
            style={
                props.fixedDimension === "width"
                    ? { ...props.outerStyle, height: innerSize?.height }
                    : { ...props.outerStyle, width: innerSize?.width }
            }
        >
            <div
                ref={inner}
                className={clsx("absolute", props.innerClassName)}
                style={
                    props.fixedDimension === "width"
                        ? { ...props.innerStyle, insetInline: 0, insetBlockStart: 0 }
                        : { ...props.innerStyle, insetBlock: 0, insetInlineStart: 0 }
                }
            >
                {props.children}
            </div>
        </div>
    );
}
