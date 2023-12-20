export class NoOpStorage implements Storage {
    get length(): number {
        return 0;
    }
    clear(): void {}
    getItem(): string | null {
        return null;
    }
    key(): string | null {
        return null;
    }
    removeItem(): void {}
    setItem(): void {}
}

export class SwitchStorage implements Storage {
    get length(): number {
        return this.base.length;
    }
    clear(): void
    {
        return this.base.clear();
    }
    getItem(key: string): string | null
    {
        return this.base.getItem(key);
    }
    key(index: number): string | null
    {
        return this.base.key(index);
    }
    removeItem(key: string): void
    {
        this.base.removeItem(key)
    }
    setItem(key: string, value: string): void
    {
        this.base.setItem(key, value)
    }
    public get baseStorage() {
        return this.base;
    }
    private base: Storage = localStorage;
}

export const noOpStorage = new NoOpStorage();
export const localStorage = typeof window === "undefined" ? noOpStorage : window.localStorage;
export const sessionStorage = typeof window === "undefined" ? noOpStorage : window.sessionStorage;
