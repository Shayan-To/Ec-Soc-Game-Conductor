/* eslint-disable no-console */
export {};

declare global {
    interface Console {
        logWithTrace(...message: any[]): void;
        logAsSingleDepthString(...message: any[]): void;
    }
}

console.logWithTrace = function logWithTrace(...message) {
    console.groupCollapsed(...message);
    console.trace();
    console.groupEnd();
};

console.logAsSingleDepthString = function logAsSingleDepthString(...message) {
    console.log(
        ...message.map((m) =>
            JSON.stringify(
                m,
                function (k, v) {
                    if (this === m || k === "" || typeof v !== "object") {
                        return v;
                    }
                    return null;
                },
                4,
            ),
        ),
    );
};
