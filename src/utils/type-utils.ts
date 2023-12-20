export type UnArray<Array> = Array extends readonly (infer T)[] ? T : never;

export function uppercase<S extends string>(str: S) {
    return str.toUpperCase() as Uppercase<S>;
}

export function lowercase<S extends string>(str: S) {
    return str.toLowerCase() as Lowercase<S>;
}

export function capitalize<S extends string>(str: S) {
    return (
        str.length === 0 ? str : `${str[0]!.toUpperCase()}${str.substring(1)}`
    ) as Capitalize<S>;
}

export function uncapitalize<S extends string>(str: S) {
    return (
        str.length === 0 ? str : `${str[0]!.toLowerCase()}${str.substring(1)}`
    ) as Uncapitalize<S>;
}

export function createObjectFromEntries<K extends keyof any, V>(
    entries: readonly (readonly [K, V])[],
) {
    return Object.fromEntries(entries) as { [key in K]: V };
}
