import "~/styles/base-styles.scss";

import nextFont from "next/font/local";
import { cookies } from "next/headers";

import { Suspense } from "react";
import { TRPCReactProvider } from "~/trpc/react";

const vazirmatn = nextFont({
    src: "../../node_modules/vazirmatn/fonts/variable/Vazirmatn[wght].ttf",
    adjustFontFallback: false,
});

export const metadata = {
    title: "Create T3 App",
    description: "Generated by create-t3-app",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout(props: { children: React.ReactNode }) {
    return (
        <html lang="fa" dir="rtl">
            <body className={vazirmatn.className}>
                <TRPCReactProvider cookies={cookies().toString()}>
                    <Suspense>{props.children}</Suspense>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
