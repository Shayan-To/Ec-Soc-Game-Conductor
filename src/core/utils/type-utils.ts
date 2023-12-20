import type { RefObject } from "react";
import { identity } from ".";

export type UnArray<A> = A extends readonly (infer T)[] ? T : never;
export type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};
export type TypedOmit<T, K extends keyof T> = Omit<T, K>;
export type MakeOptional<T, K extends keyof T> = Partial<Pick<T, K>> & TypedOmit<T, K>;
export type MakeRequired<T, K extends keyof T> = Required<Pick<T, K>> & TypedOmit<T, K>;
export type MakeNonNull<T, K extends keyof T> = { [key in K]: NonNullable<T[key]> } & TypedOmit<
    T,
    K
>;
export type SieveKeys<T, S> = {
    [key in keyof T]: S extends T[key] ? key : never;
}[keyof T];
export type MakeNullsOptional<T> = { [key in SieveKeys<T, null>]?: Exclude<T[key], null> } & Omit<
    T,
    SieveKeys<T, null>
>;
export type MakeOptionalsNullable<T> = {
    [key in keyof T]: undefined extends T[key] ? T[key] | null : T[key];
};

export type UnRef<R> = NonNullable<R> extends RefObject<infer T> | {} ? T : never;

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export type ValueOf<T> = T[keyof T];
export type KeysOfType<T, V> = { [k in keyof T]: T[k] extends V ? k : never }[keyof T];

export type Falsy = undefined | null | false | 0 | "";

export function forceType<T>(o: any): asserts o is T {}

export function forceProperty<K extends keyof any>(o: any): asserts o is { [k in K]: any } {}

export function nullable<T>(o: T): T | null {
    return o;
}

export function undefinedable<T>(o: T): T | undefined {
    return o;
}

export function createObject<T>(o: T) {
    return o;
}

export function createObjectOf<T>(o: { [key: keyof any]: T }) {
    return o;
}

export function createExactObject<T>() {
    return identity as <ET extends T>(o: ET) => ET;
}

export function createExactObjectOf<
    T,
    ExactValues extends "exactValues" | "commonTypeValues" = "commonTypeValues",
>() {
    return identity as <ET extends { [key: keyof any]: T }>(
        o: ET,
    ) => ExactValues extends "exactValues" ? ET : { [key in keyof ET]: T };
}

export function isObject(o: unknown): o is object {
    return typeof o === "object" && o !== null;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isObjectOrFunction(o: unknown): o is object | Function {
    return (typeof o === "object" || typeof o === "function") && o !== null;
}

export function makeWritable<T>(o: T) {
    return o as Writable<T>;
}

export function uppercase<S extends string>(s: S) {
    return s.toUpperCase() as Uppercase<S>;
}

export function lowercase<S extends string>(s: S) {
    return s.toLowerCase() as Lowercase<S>;
}

export function capitalize<S extends string>(s: S) {
    return (s === "" ? s : s[0]!.toUpperCase() + s.substring(1)) as Capitalize<S>;
}

export function uncapitalize<S extends string>(s: S) {
    return (s === "" ? s : s[0]!.toLowerCase() + s.substring(1)) as Uncapitalize<S>;
}
