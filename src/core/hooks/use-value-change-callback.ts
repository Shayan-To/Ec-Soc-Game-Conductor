import { useEffectEvery, useRenderBasedRef } from ".";

export function useValueChangeCallback<T>(value: T, callback: (value: T, pValue?: T) => void) {
    const ref = useRenderBasedRef<{ value: T } | undefined>(() => undefined);
    ref.current = { value };
    const prev = ref.rendered;
    useEffectEvery(() => {
        if (prev === undefined || prev.value !== value) {
            callback(value, prev?.value);
        }
    });
}
