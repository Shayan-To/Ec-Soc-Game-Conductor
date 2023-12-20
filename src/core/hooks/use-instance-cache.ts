import { useId } from "react";
import { delay } from "~/core/utils";

const cache = new Map<string, WeakRef<any>>();
const finalizationRegistry = new FinalizationRegistry(() => void cleanUp());

const cacheKeySeparator = "\ue000";

async function cleanUp() {
    let i = 0;
    for (const k of cache.keys()) {
        if (cache.get(k)?.deref() === undefined) {
            cache.delete(k);
        }
        i += 1;
        if (i === 1000) {
            i = 0;
            await delay(0);
        }
    }
    finalizationRegistry.register({}, "");
}

void cleanUp();

export function useInstanceCache<T>(key: string) {
    const componentId = useId();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cacheKey = `${componentId} ${cacheKeySeparator} ${key}`;
    // ToDo Finish implementation
}
