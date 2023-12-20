/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { delay, getDoNothing, getFalse, getTrue, incrementVersion, toggle } from "~/core/utils";
import {
    type EffectCallback,
    type RefCallback,
    type RefObject,
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

function add(cur: number, v: number) {
    return cur + v;
}

export function useCounter() {
    return useReducer(add, 0);
}

export function useToggler(initialValue = false) {
    return useReducer(toggle, initialValue);
}

export function useLoadingCounter() {
    const [counter, addCounter] = useCounter();
    return [counter !== 0, addCounter] as const;
}

export async function runWithLoading<Args extends any[], T>(
    action: (...args: Args) => Promise<T>,
    addLoadingCounter: (inc: number) => void,
    ...args: Args
) {
    try {
        addLoadingCounter(1);
        return await action(...args);
    } finally {
        addLoadingCounter(-1);
    }
}

export function useIsHydrating() {
    return useSyncExternalStore(getDoNothing, getFalse, getTrue);
}

export const useHotReload =
    process.env.NODE_ENV !== "development"
        ? undefined
        : function useHotReload(action: () => void) {
              const firstRun = useRef<boolean>(true);
              useMemo(() => {
                  if (firstRun.current) {
                      firstRun.current = false;
                      return;
                  }
                  // eslint-disable-next-line no-console
                  console.log("## HOT RELOADING ...");
                  action();
                  // eslint-disable-next-line react-hooks/exhaustive-deps
              }, []);
          };

export function useInitializer(action: () => void) {
    const isHydrating = useIsHydrating();
    useEffect(() => {
        if (!isHydrating) {
            action();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrating]);
}

export function useEffectOnce(effect: EffectCallback) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(effect, []);
}

export function useEffectEvery(effect: EffectCallback) {
    useEffect(effect);
}

export function useDestructor(destructor: () => void) {
    const effect = useRef<() => () => void>();
    if (effect.current === undefined) {
        let version = 0;
        effect.current = function destructorEffect() {
            const currentVersion = (version = incrementVersion(version));
            return () => {
                void (async () => {
                    await delay(500);
                    if (version !== currentVersion) {
                        return;
                    }
                    destructor();
                })();
            };
        };
    }
    useEffectOnce(effect.current);
}

export function useInitRef<T>(ctor: () => T, init?: (v: T) => void): T {
    const ref = useRef<T>();
    if (ref.current === undefined) {
        ref.current = ctor();
        init?.(ref.current);
    }
    useHotReload?.(() => {
        const n = ctor();
        init?.(n);
        if (
            typeof n === "object" &&
            n !== null &&
            "onHotReloaded" in n &&
            typeof n.onHotReloaded === "function"
        ) {
            n.onHotReloaded(ref.current, n);
        }
        ref.current = n;
    });
    return ref.current;
}

export function useStateRefOld<T extends object>(ctor: () => T): T {
    type TV = T & { "!!version!!": number };
    const ref = useRef<{
        state: TV;
        version: number;
        proxyHandler: ProxyHandler<TV>;
    }>();
    if (ref.current === undefined) {
        const getState = function (target: TV) {
            if (target["!!version!!"] === ref.current!.version) {
                return target;
            }
            target["!!version!!"] = -1;
            return ref.current!.state;
        };
        ref.current = {
            state: { ...ctor(), "!!version!!": 0 },
            version: 0,
            proxyHandler: {
                set(_, prop, value) {
                    setState((state) => {
                        if (state[prop as keyof T] === value) {
                            return state;
                        }
                        return {
                            ...state,
                            [prop]: value,
                        };
                    });
                    return true;
                },
                get(target, prop) {
                    return getState(target)[prop as keyof T];
                },
            },
        };
    }
    const [state, setState] = useState(ref.current.state);
    useLayoutEffect(() => {
        ref.current!.state = state;
        ref.current!.version = incrementVersion(ref.current!.version);
    });
    // There is a memory leak here.
    // Proxy target (`state`) is kept alive, while it's not being used anymore.
    // Maybe use `new Proxy(..., new Proxy(...))` trick to have swappable target.
    return new Proxy({ ...state, "!!version!!": ref.current.version }, ref.current.proxyHandler);
}

export interface StateGetters<T> {
    currentState: Promise<T>;
    renderedState: T;
}

export function useStateRef<T extends object>(ctor: () => T): T & StateGetters<T> {
    type TV = T & { "!!version!!": number };
    const ref = useRef<{
        renderedState: TV;
        version: number;
        proxyHandler: ProxyHandler<TV>;
    }>();
    if (ref.current === undefined) {
        ref.current = {
            renderedState: { ...ctor(), "!!version!!": 0 },
            version: 0,
            proxyHandler: {
                set(target, prop, value) {
                    if (target["!!version!!"] === ref.current!.version) {
                        throw new Error("Cannot set state before mount.");
                    }
                    setState((state) => {
                        if (state[prop as keyof T] === value) {
                            return state;
                        }
                        return {
                            ...state,
                            [prop]: value,
                        };
                    });
                    return true;
                },
                get(target, prop) {
                    if ((prop as keyof StateGetters<T>) === "currentState") {
                        return new Promise<T>((resolve) => setState((s) => (resolve({ ...s }), s)));
                    }
                    if ((prop as keyof StateGetters<T>) === "renderedState") {
                        return { ...ref.current!.renderedState };
                    }
                    if (target["!!version!!"] !== ref.current!.version) {
                        throw new Error("Cannot get state after mount.");
                    }
                    return target[prop as keyof T];
                },
            },
        };
    }
    const [state, setState] = useState(ref.current.renderedState);
    useLayoutEffect(() => {
        ref.current!.renderedState = state;
        ref.current!.version = incrementVersion(ref.current!.version);
    });
    // There is a memory leak here.
    // Proxy target (`state`) is kept alive, while it's not being used anymore.
    // Maybe use `new Proxy(..., new Proxy(...))` trick to have swappable target.
    return new Proxy<TV>(
        { ...state, "!!version!!": ref.current.version },
        ref.current.proxyHandler,
    ) as T as T & StateGetters<T>;
}

export function useRenderBasedRef<T>(ctor: () => T): { current: T; readonly rendered: T } {
    const ref = useRef<{
        value: T;
        version: number;
    }>();
    if (ref.current === undefined) {
        ref.current = {
            value: ctor(),
            version: 0,
        };
    }
    const r = ref.current;

    const currentVersion = r.version;
    let value = r.value;
    let expired = false;

    useLayoutEffect(() => {
        if (!expired) {
            r.value = value;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        value = null!; // prevent memory leak
        // eslint-disable-next-line react-hooks/exhaustive-deps
        expired = true;
        ref.current!.version = incrementVersion(ref.current!.version);
    });

    return {
        get rendered() {
            return r.value;
        },
        get current() {
            if (currentVersion !== r.version) {
                return r.value;
            }
            return value;
        },
        set current(v: T) {
            if (currentVersion !== r.version) {
                throw new Error("Cannot change a render-based ref from after render is done.");
            }
            value = v;
        },
    };
}

export function usePropsRef<T extends object>(props: T): T & { readonly rendered: T } {
    const ref = useRenderBasedRef<T>(() => props);
    ref.current = { ...props };
    return new Proxy(
        {} as any,
        new Proxy(
            {},
            {
                get(_, p) {
                    return (_: any, ...args: any[]) => {
                        if (p === "get" && args[0] === "rendered") {
                            return ref.rendered;
                        }
                        return (Reflect as any)[p].call(Reflect, ref.current, ...args);
                    };
                },
            },
        ),
    );
}

export function useElRef<T = HTMLElement>() {
    return useRef<T>(null) as RefObject<T> & RefCallback<T>;
}
