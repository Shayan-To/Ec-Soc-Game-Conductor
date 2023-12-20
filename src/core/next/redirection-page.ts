import { useRouterReady } from "./router-ready";

export function createRedirectionPage(destination: string) {
    const component = function RedirectionPage() {
        useRouterReady((router) => {
            router.replace(destination + (router.asPath.match(/^.*?([?#].*)$/) ?? { 1: "" })[1]);
        });
        return null;
    };

    return { component };
}
