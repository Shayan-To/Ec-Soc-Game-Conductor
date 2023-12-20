/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type TextFieldSelection } from "~/core/components/selection-text-field";
import { type StateGetters } from "~/core/hooks";
import { type Disposable, makeDisposable } from "~/core/utils/disposables";
import { type ChangeEvent, type ComponentType, type SyntheticEvent } from "react";
import { doNothing, identity, incrementVersion } from ".";

export function getComponentName(component: ComponentType) {
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/prefer-nullish-coalescing
    return component.displayName || (component as Function).name || "Component";
}

export const dummyEvent: SyntheticEvent<any> = {
    bubbles: false,
    cancelable: false,
    currentTarget: null,
    defaultPrevented: false,
    eventPhase: 0,
    isDefaultPrevented() {
        return false;
    },
    isPropagationStopped() {
        return false;
    },
    isTrusted: false,
    nativeEvent: new Event(""),
    persist() {},
    preventDefault() {},
    stopPropagation() {},
    target: new EventTarget(),
    timeStamp: 0,
    type: "",
};

export function changeSetter<State extends object>(
    state: (State & StateGetters<State>) | null,
    prop: keyof State | null,
    onChange: (value: any) => void = doNothing,
    coerce: (value: any, prevValue: any) => any = identity,
) {
    const name = `${String(prop)}Setter`;
    return {
        [name]: async function (e: { target: { value: any; name: string } }) {
            const value = e.target.value;
            const pValue =
                prop === null || state === null ? null : (state.renderedState[prop] as any);
            const cValue = coerce(value, pValue);
            if (cValue === pValue) {
                return;
            }
            if (prop !== null && state !== null) {
                state[prop] = cValue;
            }
            onChange(cValue);
        },
    }[name];
}

export function changeSetterCB<State extends object>(
    state: (State & StateGetters<State>) | null,
    prop: keyof State | null,
    onChange: (value: any) => void = doNothing,
    coerce: (value: any, prevValue: any) => any = identity,
) {
    const name = `${String(prop)}Setter`;
    return {
        [name]: async function (e: ChangeEvent<HTMLInputElement>) {
            const value = e.target.checked as any;
            const pValue =
                prop === null || state === null ? null : (state.renderedState[prop] as any);
            const cValue = coerce(value, pValue);
            if (cValue === pValue) {
                return;
            }
            if (prop !== null && state !== null) {
                state[prop] = cValue;
            }
            onChange(cValue);
        },
    }[name];
}

export function changeSetterATF<State extends object & { version: number }>(
    state: State & StateGetters<State>,
    prop: keyof State | null,
    onChange: (value: string) => void = doNothing,
    coerce: (value: string, prevValue: string) => string = identity,
) {
    const name = `${String(prop)}SetterATF`;
    return {
        [name]: async function (d: TextFieldSelection) {
            const value = d.value;
            const cState = await state.currentState;
            const pValue = prop === null ? "" : (cState[prop] as string);
            const cValue = coerce(value, pValue);
            if (cValue === pValue) {
                return;
            }
            state.version = incrementVersion(cState.version);
            if (prop !== null) {
                state[prop] = cValue as any;
            }
            onChange(cValue);
        },
    }[name];
}

export function preventDefault<Event extends SyntheticEvent<any>, R>(
    handler: ((e: Event) => R) & Disposable,
) {
    const name = `${handler.name}.preventDefault`;
    const rFunc = {
        [name]: function (e?: Event) {
            e?.preventDefault();
            return handler(e!);
        },
    }[name];
    makeDisposable(rFunc, handler.dispose);
    return rFunc;
}

export function stopPropagation<Event extends SyntheticEvent<any>, R>(
    handler: ((e: Event) => R) & Disposable,
) {
    const name = `${handler.name}.stopPropagation`;
    const rFunc = {
        [name]: function (e?: Event) {
            e?.stopPropagation();
            return handler(e!);
        },
    }[name];
    makeDisposable(rFunc, handler.dispose);
    return rFunc;
}
