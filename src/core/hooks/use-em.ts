import { useState } from "react";
import { useEffectEvery } from ".";

export function useEm(element: HTMLElement | null, defaultValue = 16) {
    const [em, setEm] = useState(defaultValue);

    useEffectEvery(() => {
        if (element === null) {
            return;
        }
        setEm(parseFloat(window.getComputedStyle(element).fontSize));
    });

    return em;
}
