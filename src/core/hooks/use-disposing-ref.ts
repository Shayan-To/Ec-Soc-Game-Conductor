import { disposeProps } from "~/core/utils/disposables";
import { useRef } from "react";
import { useDestructor, useHotReload } from ".";

export function useDisposingRef<T extends object>(ctor: () => T, init?: (v: T) => void): T {
    const ref = useRef<{ value: T; destructor: () => void }>();
    if (ref.current === undefined) {
        const value = ctor();
        ref.current = {
            value,
            destructor: disposeProps.bind(undefined, value),
        };
        init?.(ref.current.value);
    }
    useDestructor(ref.current.destructor);
    useHotReload?.(() => {
        ref.current!.destructor();
        const value = ctor();
        ref.current = {
            value,
            destructor: disposeProps.bind(undefined, value),
        };
        init?.(ref.current.value);
    });
    return ref.current.value;
}
