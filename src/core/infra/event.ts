export type EventHandler<EventArgs = void> = (e: EventArgs) => void;

export class Event<EventArgs = void, Data = void> {
    /**
     * @returns the cleanup function.
     */
    public addListener(listener: EventHandler<EventArgs>, data: Data) {
        this.listeners.push(listener);
        this.data.push(data);
        return this.removeListener.bind(this, listener);
    }

    public removeListener(listener: EventHandler<EventArgs>) {
        const i= this.listeners.findIndex(l => l=== listener);
        if (i !== -1) {
            this.listeners.splice(i, 1);
            this.data.splice(i, 1);
        }
    }

    public forEachListener(action: (listener: EventHandler<EventArgs>, data: Data) => void | false) {
        for (let i = 0; i < this.listeners.length; i += 1) {
            if (action(this.listeners[i]!, this.data[i]!) === false) {
                break;
            }
        }
    }

    private listeners: EventHandler<EventArgs>[] = [];
    private data: Data[] = [];
}
