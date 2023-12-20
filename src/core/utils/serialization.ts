export function objectToConsistentString(
    o: Record<keyof any, boolean | string | number | null | undefined>,
) {
    return Object.entries(o)
        .sort(([k1], [k2]) => (k1 < k2 ? -1 : k1 > k2 ? 1 : 0))
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
}
