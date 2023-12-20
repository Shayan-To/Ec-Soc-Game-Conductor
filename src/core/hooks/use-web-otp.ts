import { useInitRef } from ".";

declare global {
    interface CredentialRequestOptions {
        otp?: OTPCredentialRequestOptions;
    }

    interface OTPCredentialRequestOptions {
        transport?: OTPCredentialTransportType[];
    }

    interface OTPCredential extends Credential {
        type: "otp";
        code: string;
    }

    type OTPCredentialTransportType = "sms";
}

export function useWebOtp(receiveCallback: (otp: string) => void) {
    const r = useInitRef(() => ({
        ac: null as AbortController | null,
        f: {
            abort() {
                r.ac?.abort();
                r.ac = null;
            },
            start() {
                r.f.abort();

                if (!("OTPCredential" in window)) {
                    return;
                }

                r.ac = new AbortController();

                (async () => {
                    try {
                        const otp = (await navigator.credentials.get({
                            otp: { transport: ["sms"] },
                            signal: r.ac!.signal,
                        })) as OTPCredential | null;
                        if (otp?.code) {
                            receiveCallback(otp.code);
                        }
                    } catch (er) {
                        // eslint-disable-next-line no-console
                        console.error("## DEBUG ## web otp error: ", er);
                    }
                })();
            },
        },
    }));

    return r.f;
}
