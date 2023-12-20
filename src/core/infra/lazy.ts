export function lazy<T>(getter: () => T | Promise<T>) {
    let value: T | undefined;
    const r = {
        hasValue: false,
        getValue() {
            const promise = r.ensureValue();
            if (!r.hasValue) {
                throw promise;
            }
            return value as T;
        },
        async getValueAsync() {
            await r.ensureValue();
            return value as T;
        },
        async ensureValue() {
            if (r.hasValue) {
                return;
            }
            const gValue = getter();
            value = await gValue;
            r.hasValue = true;
        },
        reset() {
            r.hasValue = false;
        },
    };
    return r as Readonly<typeof r>;
}
