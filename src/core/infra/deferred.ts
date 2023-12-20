export class Deferred<T> {
    public constructor() {
        // eslint-disable-next-line prefer-rest-params
        if (typeof arguments[0] !== "undefined") {
            // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-unsafe-assignment
            this.promise = arguments[0];
            return;
        }

        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public resolve(value: T | PromiseLike<T>): void {
        throw new Error("Not implemented.");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public reject(reason?: any): void {
        throw new Error("Not implemented.");
    }

    public static resolved<T>(value: T): Deferred<Awaited<T>>;
    public static resolved(): Deferred<void>;
    public static resolved<T>(value?: T) {
        if (value === undefined) {
            return Deferred.resolvedVoid;
        }
        return new Deferred<Awaited<T>>(...([Promise.resolve(value)] as any[] as []));
    }

    private static readonly resolvedVoid = new Deferred<void>(
        ...([Promise.resolve()] as any[] as []),
    );

    public readonly promise: Promise<T>;
}
