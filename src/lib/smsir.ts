import { env } from "~/env";

const smnirBaseUrl = "https://api.sms.ir";

export async function sendSmsirVerifyCode(
    mobile: string,
    templateId: number,
    parameters: { name: string; value: string }[],
) {
    return fetch(`${smnirBaseUrl}/v1/send/verify/`, {
        method: "POST",
        headers: {
            "X-API-KEY": env.SMSIR_API_KEY,
            ACCEPT: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile, templateId, parameters }),
    });
}
