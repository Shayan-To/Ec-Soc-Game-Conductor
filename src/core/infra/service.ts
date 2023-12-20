import { useSyncExternalStore } from "react";
import { Event, type EventHandler } from "./event";

export class Service<T> {
    public constructor(public readonly name: string, protected readonly defaultValue: T) {
        this.value = defaultValue;
    }

    public getDefaultValue() {
        return this.defaultValue;
    }

    public getValue() {
        return this.value;
    }

    public setValue(value: T) {
        this.value = value;
        this.onChange();
    }

    protected onChange() {
        this.changeEvent.forEachListener((l) => l());
    }

    /**
     * @returns the cleanup function.
     */
    public addChangeListener(listener: EventHandler) {
        return this.changeEvent.addListener(listener);
    }

    public use() {
        this.boundFuncs ??= {
            addChangeListener: this.addChangeListener.bind(this),
            getValue: this.getValue.bind(this),
            getDefaultValue: this.getDefaultValue.bind(this),
        }
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useSyncExternalStore(this.boundFuncs.addChangeListener, this.boundFuncs.getValue, this.boundFuncs.getDefaultValue);
    }

    private boundFuncs:
        | {
              addChangeListener: (onStoreChange: () => void) => () => void;
              getValue: () => T;
              getDefaultValue: () => T;
          }
        | undefined;
    protected value: T;
    private readonly changeEvent = new Event();
}
