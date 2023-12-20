import { useInitRef } from "~/core/hooks";
import { delay, incrementVersion } from "~/core/utils";
import { useEffect } from "react";

export interface TimeoutConfig {
    started: boolean;
    timeout?: number;
    timedOut: () => void;
}
export function useTimeout(config: TimeoutConfig) {
    const s = useInitRef(() => ({
        lastStarted: false,
        startTime: 0,
        version: 0,
    }));
    useEffect(() => {
        s.version = incrementVersion(s.version);

        if (s.lastStarted !== config.started) {
            if (config.started) {
                s.startTime = performance.now();
            } else {
                return;
            }
        }

        const version = s.version;
        (async () => {
            while (true) {
                if (config.timeout === undefined) {
                    return;
                }
                const delayTime = s.startTime + config.timeout - performance.now();
                if (delayTime <= 0) {
                    config.timedOut();
                    return;
                }
                await delay(delayTime);
                if (version !== s.version) {
                    return;
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.started, config.timeout]);
}
