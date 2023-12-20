import { combineVoidFunctions } from "~/core/utils";
import { isObjectOrFunction } from "~/core/utils/type-utils";

export interface Disposable {
    dispose?(): void;
}

export function makeDisposable<T>(o: T, dispose?: () => void): asserts o is T & Disposable {
    if (dispose !== undefined) {
        (o as Disposable).dispose = dispose;
    }
}

export function dispose(o: unknown) {
    if (isObjectOrFunction(o) && "dispose" in o && typeof o.dispose === "function") {
        o.dispose();
    }
}

export function disposeProps(o: object) {
    for (const k in o) {
        dispose((o as any)[k]);
    }
    dispose(o);
}

export function combineDisposableVoidFunctions<Func extends (...args: any[]) => void>(
    ...funcs: ((Func & Disposable) | undefined)[]
): (Func & Disposable) | undefined {
    const combined = combineVoidFunctions(...funcs);
    makeDisposable(combined, combineVoidFunctions(...funcs.map((f) => f?.dispose)));
    return combined;
}
