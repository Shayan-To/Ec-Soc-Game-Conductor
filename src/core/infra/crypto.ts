/* eslint-disable @typescript-eslint/no-var-requires */

export const crypto: {
    /**
     * Available only in secure contexts.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Crypto/subtle)
     *
     * -----
     *
     * Provides access to the `SubtleCrypto` API.
     * @since v15.0.0
     */
    readonly subtle: SubtleCrypto | typeof import("crypto").webcrypto.subtle;
    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Crypto/getRandomValues)
     *
     * -----
     *
     * Generates cryptographically strong random values.
     * The given `typedArray` is filled with random values, and a reference to `typedArray` is returned.
     *
     * The given `typedArray` must be an integer-based instance of {@link NodeJS.TypedArray}, i.e. `Float32Array` and `Float64Array` are not accepted.
     *
     * An error will be thrown if the given `typedArray` is larger than 65,536 bytes.
     * @since v15.0.0
     */
    getRandomValues<T extends Exclude<NodeJS.TypedArray, Float32Array | Float64Array>>(array: T): T;

    /**
     * Available only in secure contexts.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Crypto/randomUUID)
     *
     * -----
     *
     * Generates a random {@link https://www.rfc-editor.org/rfc/rfc4122.txt RFC 4122} version 4 UUID.
     * The UUID is generated using a cryptographic pseudorandom number generator.
     * @since v16.7.0
     */
    randomUUID(): string;
} =
    typeof window !== "undefined"
        ? window.crypto
        : (require("crypto") as typeof import("crypto")).webcrypto;

if (crypto.randomUUID === undefined) {
    const template = "bbbb-bb-4hb-8hb-bbbbbb";
    const halfToHex = new Array(16).fill(null).map((_, i) => i.toString(16));
    const byteToHex = new Array(256).fill(null).map((_, i) => i.toString(16).padStart(2, "0"));
    const buffer = new Uint8Array(17);

    crypto.randomUUID = function randomUUID() {
        const bytes = crypto.getRandomValues(buffer);
        let i = 0;
        return template.replace(/[bh8]/g, (c) => {
            if (c === "b") {
                return byteToHex[bytes[i++]!]!;
            } else if (c === "h") {
                return halfToHex[bytes[i++]! & 15]!;
            } else {
                // c === '8'
                return halfToHex[(bytes[i++]! & 3) | 8]!;
            }
        });
    };
}
