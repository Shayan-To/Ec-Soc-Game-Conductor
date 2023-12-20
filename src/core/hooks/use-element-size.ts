import { type RefObject, useEffect, useRef, useState } from "react";
import { useEffectOnce } from ".";

export function useElementSize(
    element: RefObject<HTMLElement> | HTMLElement | null | undefined,
    kind: "inner" | "outer",
) {
    const prefix = kind === "inner" ? ("client" as const) : ("offset" as const);

    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const ref = useRef<{ element: HTMLElement | null; observer: ResizeObserver }>();

    useEffect(() => {
        if (ref.current === undefined) {
            ref.current = {
                element: null,
                observer: new ResizeObserver((entries) => {
                    if (entries.length !== 1 || entries[0]!.target !== ref.current!.element) {
                        throw new Error("Assertion error.");
                    }
                    setSize({
                        width: ref.current!.element[`${prefix}Width`],
                        height: ref.current!.element[`${prefix}Height`],
                    });
                }),
            };
        }

        const el =
            typeof element === "object" && element !== null && "current" in element
                ? element.current
                : element ?? null;
        ref.current.element = el;
        if (el === null) {
            setSize(null);
            return;
        }
        setSize({ width: el[`${prefix}Width`], height: el[`${prefix}Height`] });
        ref.current.observer.observe(el);
        return () => ref.current!.observer.unobserve(el);
    }, [element, prefix]);

    return size;
}

export function useWindowSize(kind: "inner" | "outer") {
    const [size, setSize] = useState({ width: 800, height: 600 });

    useEffectOnce(() => {
        setSize({ width: window[`${kind}Width`], height: window[`${kind}Height`] });
        function onWindowResize() {
            setSize({ width: window[`${kind}Width`], height: window[`${kind}Height`] });
        }
        window.addEventListener("resize", onWindowResize);
        return () => window.removeEventListener("resize", onWindowResize);
    });

    return size;
}
