import App, { type AppProps } from "next/app";
import { Router } from "next/router";
import { type ComponentType } from "react";
import { getClient } from "./next-client";

let serverRouter: Router | undefined;

export function getRouter() {
    const r = getClient()?.router ?? serverRouter!;
    if (r && !r.events) {
        r.events = Router.events;
    }
    return r;
}

export function extractRouter(
    app: ComponentType<AppProps> &
        Partial<Pick<typeof App, "getInitialProps" | "origGetInitialProps">>,
) {
    app.getInitialProps = function getInitialProps(c) {
        serverRouter = c.router;
        return App.getInitialProps(c);
    };
    // app.origGetInitialProps = app.getInitialProps;
}
