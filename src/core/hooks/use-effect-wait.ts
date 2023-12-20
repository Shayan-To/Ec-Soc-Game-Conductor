import { Deferred } from "~/core/infra/deferred";
import { useEffect, useLayoutEffect } from "react";
import { useInitRef } from ".";

export function useEffectWait(effectType: "effect" | "layoutEffect" = "effect") {
    const r = useInitRef(() => ({
        deferred: null as Deferred<void> | null,
        wait() {
            r.deferred ??= new Deferred();
            return r.deferred.promise;
        },
        effect() {
            r.deferred?.resolve();
            r.deferred = null;
        },
    }));
    (effectType === "effect" ? useEffect : useLayoutEffect)(r.effect);
    return r.wait;
}
