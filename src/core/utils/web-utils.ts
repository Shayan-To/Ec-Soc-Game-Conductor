export function fromQueryParams(p: URLSearchParams) {
    const o: { [key: string]: string } = {};
    for (const [k, v] of p.entries()) {
        o[k] = v;
    }
    return o;
}

export function toQueryParams(o: { [key: string]: string }) {
    const p = new URLSearchParams();
    for (const k of Object.keys(o)) {
        p.set(k, o[k]!);
    }
    return p;
}

export async function blobToDataUrl(b: Blob) {
    if (typeof FileReader !== "undefined") {
        return await new Promise<string>((resolve) => {
            const fileReader = new FileReader();
            fileReader.onloadend = () => resolve(fileReader.result as string);
            fileReader.readAsDataURL(b);
        });
    }
    const buffer = Buffer.from(await b.arrayBuffer());
    return `data:${b.type};base64,${buffer.toString("base64")}`;
}
