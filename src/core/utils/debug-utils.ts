export function logFunctionCalls<T extends object>(
    obj: T,
    objName: string,
    cfg?: { trace?: boolean; returnValue?: boolean },
) {
    // eslint-disable-next-line no-param-reassign
    cfg ??= {};
    return new Proxy(obj, {
        get(target, p, receiver) {
            const v: unknown = Reflect.get(target, p, receiver);
            if (typeof v !== "function" || v.prototype !== undefined) {
                return v;
            }
            const name = `${p.toString()}_${logFunctionCalls.name}`;
            if (cfg?.returnValue ?? true) {
                return {
                    [name]: function (...args: any[]) {
                        const r = v.apply(this, args);
                        // eslint-disable-next-line no-console
                        (cfg?.trace ?? true ? console.logWithTrace : console.log)(
                            objName,
                            ".",
                            p,
                            "(",
                            ...args,
                            ") => ",
                            r,
                        );
                        return r;
                    },
                }[name];
            } else {
                return {
                    [name]: function (...args: any[]) {
                        // eslint-disable-next-line no-console
                        (cfg?.trace ?? true ? console.logWithTrace : console.log)(
                            objName,
                            ".",
                            p,
                            "(",
                            ...args,
                            ")",
                        );
                        return v.apply(this, args);
                    },
                }[name];
            }
        },
    });
}
