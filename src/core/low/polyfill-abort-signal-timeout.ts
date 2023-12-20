export {};

AbortSignal.timeout ??= function timeout(ms) {
    const controller = new AbortController();
    setTimeout(controller.abort.bind(controller), ms);
    return controller.signal;
};
