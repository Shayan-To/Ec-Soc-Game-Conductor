import ResizeObserver from "resize-observer-polyfill";

if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = ResizeObserver;
}
