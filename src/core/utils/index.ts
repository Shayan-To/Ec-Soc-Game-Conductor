import { type Falsy, forceType, type TypedOmit } from "./type-utils";

export const aSecond = 1000;
export const aMinute = 60 * aSecond;
export const anHour = 60 * aMinute;
export const aDay = 24 * anHour;

export const nbsp = "\u00A0";
export const lrm = "\u200E";
export const rlm = "\u200F";

export function throwError(message: string): never;
export function throwError(error: Error): never;
export function throwError(error: Error | string): never {
    throw typeof error === "string" ? new Error(error) : error;
}

export function safeToInt(value: number, maxError = 1e-6) {
    const int = Math.round(value) | 0;
    const error = Math.abs(value - int);
    if (error > maxError) {
        throw new Error(
            `Should not convert ${value} to int. error: ${error} > maxError: ${maxError}`,
        );
    }
    return int;
}

export function delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function normalizeToArray<T>(a: T | T[]) {
    return Array.isArray(a) ? a : [a];
}

export function toggle(b: boolean) {
    return !b;
}

export function getNullAsNever() {
    return null!;
}

export function getTrue() {
    return true;
}

export function getFalse() {
    return false;
}

export function getDoNothing() {
    return doNothing;
}

export function doNothing() {}

export function identity<T>(value: T) {
    return value;
}

export function incrementVersion(s: number) {
    return (s + 1) & 0xffffff;
}

export function removeUndefinds<T>(o: T): T {
    if (typeof o !== "object" || o === null) {
        return o;
    }

    if (Array.isArray(o)) {
        return o.map((v: {}) => removeUndefinds(v)) as any as T;
    }

    forceType<{ [k: string]: unknown }>(o);
    const res: { [k: string]: unknown } = {};

    for (const [k, v] of Object.entries(o)) {
        if (v !== undefined) {
            res[k] = removeUndefinds(v);
        }
    }

    return res as any as T;
}

export function setDefaults<T extends object>(obj: Partial<T>, defaults: T): asserts obj is T {
    for (const k in defaults) {
        if (obj[k] === undefined) {
            obj[k] = defaults[k];
        }
    }
}

export function pickFromObject<T extends object, Keys extends keyof T>(obj: T, ...keys: Keys[]) {
    const res = {} as Pick<T, Keys>;
    for (const k of keys) {
        res[k] = obj[k];
    }
    return res;
}

export function omitFromObject<T extends object, OKeys extends keyof T>(obj: T, ...keys: OKeys[]) {
    const res = {} as TypedOmit<T, OKeys>;
    type Keys = keyof typeof res;
    const omitted = Object.fromEntries(keys.map((k) => [k, true])) as { [k in keyof T]?: true };
    for (const k of Object.keys(obj) as Keys[]) {
        if (!omitted[k]) {
            res[k] = obj[k];
        }
    }
    return res;
}

export function combineObjects<T extends object | undefined>(o1: T, o2: T): T {
    if (!o1) {
        return o2;
    }
    if (!o2) {
        return o1;
    }
    return { ...o1, ...o2 };
}

export function combineVoidFunctions<Func extends (...args: any[]) => void>(
    ...funcs: (Func | undefined)[]
): Func | undefined {
    const fns = funcs.filter(notUndefined);
    if (fns.length === 1) {
        return fns[0];
    }
    if (fns.length === 0) {
        return undefined;
    }
    return function combined(...args): void {
        for (const f of fns) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            f(...args);
        }
    } as Func;
}

export function notUndefined<T>(o: T): o is Exclude<T, undefined> {
    return o !== undefined;
}

export function isUndefined<T>(o: T): o is undefined & T {
    return o === undefined;
}

export function notNull<T>(o: T): o is Exclude<T, null> {
    return o !== null;
}

export function isNull<T>(o: T): o is null & T {
    return o === null;
}

export function notFalsy<T>(o: T): o is Exclude<T, Falsy> {
    return !!o;
}

export function isFalsy<T>(o: T): o is Falsy & T {
    return !o;
}
