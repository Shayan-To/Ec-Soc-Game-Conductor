import { type MutableRefObject, type Ref, type RefObject, useLayoutEffect } from "react";
import { useInitRef } from ".";

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
    if (ref === null || ref === undefined) {
        return;
    }
    if ("current" in ref) {
        (ref as MutableRefObject<T | null>).current = value;
    } else {
        ref(value);
    }
}

export function useForwardingRef<T>(
    ref: Ref<T> | undefined,
    onChange: ((value: T) => void) | undefined,
    initialValue: T,
): MutableRefObject<T>;
export function useForwardingRef<T>(
    ref: Ref<T> | undefined,
    onChange: ((value: T | null) => void) | undefined,
    initialValue: T | null,
): RefObject<T>;
export function useForwardingRef<T>(
    ref: Ref<T> | undefined,
    onChange?: (value: T | null) => void,
): RefObject<T>;

export function useForwardingRef<T>(
    ref: Ref<T> | undefined,
    onChange?: (value: T | null) => void,
    initialValue: T | null = null,
) {
    const r = useInitRef(() => ({
        value: initialValue,
        ref,
        outRef: {
            get current() {
                return r.value;
            },
            set current(value: T | null) {
                r.value = value;
                setRef(ref, value);
                onChange?.(value);
            },
        },
    }));
    useLayoutEffect(() => {
        if (r.value !== null) {
            setRef(ref, r.value);
        }
        r.ref = ref;
        return () => setRef(ref, null);
    }, [ref, r]);
    return r.outRef;
}
