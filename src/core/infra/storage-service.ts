import { type Service } from "./service";

const classes = new Map<
    new (...args: any[]) => Service<any>,
    new (...args: any[]) => Service<any>
>();

interface Serializable<T> {
    serialize: (arg: T) => any;
    deserialize: (arg: any) => T;
}

function storageServiceClass<T>(
    serviceClass: new (...args: any[]) => Service<T>,
    opts?: Serializable<T>,
) {
    if (classes.has(serviceClass)) {
        return classes.get(serviceClass) as never;
    }
    class StorageService extends serviceClass {
        protected initialize() {
            if (typeof window !== "undefined") {
                const lsValue = this.storage.getItem(this.name);
                if (lsValue !== null) {
                    const parsedValue = JSON.parse(lsValue);
                    this.value = opts ? opts.deserialize(parsedValue) : parsedValue;
                }
            }
        }

        protected onChange() {
            if (typeof window !== "undefined") {
                const serializedValue = opts ? opts.serialize(this.value) : this.value;
                this.storage.setItem(this.name, JSON.stringify(serializedValue));
            }
            super.onChange();
        }

        protected readonly storage!: Storage;
    }
    classes.set(serviceClass, StorageService);
    return StorageService;
}

export function inStorage<Svc extends Service<any>>(
    service: Svc,
    storage: Storage,
    opts?: Serializable<Svc extends Service<infer T> ? T : never>,
) {
    type T = Svc extends Service<infer T> ? T : never;
    // eslint-disable-next-line @typescript-eslint/ban-types
    const serviceClass = (service as Object).constructor as new (...args: any[]) => Service<T>;

    const StorageService = storageServiceClass(serviceClass, opts);
    type StorageService = InstanceType<typeof StorageService>;

    Object.setPrototypeOf(service, StorageService.prototype);
    (service as any).storage = storage;
    (service as any).initialize();

    return service as Svc & StorageService;
}
