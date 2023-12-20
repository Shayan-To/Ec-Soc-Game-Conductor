/* eslint-disable @typescript-eslint/no-var-requires */

const next_client =
    typeof window !== "undefined"
        ? (require("next/client") as typeof import("next/client"))
        : undefined!;

export function getClient() {
    return next_client as typeof next_client | undefined;
}

export function getEmitter() {
    return next_client.emitter;
}

export function hydrate(...args: Parameters<typeof next_client.hydrate>) {
    return next_client.hydrate(...args);
}

export function initialize(...args: Parameters<typeof next_client.initialize>) {
    return next_client.initialize(...args);
}

export function getVersion() {
    return next_client.version;
}
