import { type Service } from "./service";

const classes = new Map<
    new (...args: any[]) => Service<any>,
    new (...args: any[]) => Service<any>
>();

function lockableServiceClass<T>(serviceClass: new (...args: any[]) => Service<T>) {
    if (classes.has(serviceClass)) {
        return classes.get(serviceClass) as never;
    }
    class LockableService extends serviceClass {
        public setValue(value: T) {
            this.lastValue = value;
            if (!this._isLocked) {
                super.setValue(value);
            }
        }

        public getLastValue() {
            return this.lastValue;
        }

        public lock() {
            this._isLocked = true;
        }

        public unlock() {
            this._isLocked = false;
            super.setValue(this.lastValue);
        }

        public isLocked() {
            return this._isLocked;
        }

        private _isLocked = false;
        private lastValue = this.value;
    }
    classes.set(serviceClass, LockableService);
    return LockableService;
}

export function makeLockable<Svc extends Service<any>>(service: Svc) {
    type T = Svc extends Service<infer T> ? T : never;
    // eslint-disable-next-line @typescript-eslint/ban-types
    const serviceClass = (service as Object).constructor as new (...args: any[]) => Service<T>;

    const LockableService = lockableServiceClass(serviceClass);
    type LockableService = InstanceType<typeof LockableService>;

    Object.setPrototypeOf(service, LockableService.prototype);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any)._isLocked = false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    (service as any).lastValue = (service as any).value;

    return service as Svc & LockableService;
}
