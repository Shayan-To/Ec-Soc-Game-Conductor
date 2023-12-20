export function setEquals<T>(s1: T[], s2: T[]) {
    const set = new Set(s1);
    for (const i of s2) {
        if (!set.delete(i)) {
            return false;
        }
    }
    return set.size === 0;
}
