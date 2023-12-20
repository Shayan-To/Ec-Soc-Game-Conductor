const pDigitsRegex = /[۰-۹]/g;
const lDigitsRegex = /[0-9]/g;
const p0 = "۰".charCodeAt(0);
const l0 = "0".charCodeAt(0);

export function localizeDigits(str: string) {
    return str
        .replace(lDigitsRegex, (d) => String.fromCharCode(d.charCodeAt(0) - l0 + p0))
        .replaceAll("%", "٪");
}

export function delocalizeDigits(str: string) {
    return str
        .replace(pDigitsRegex, (d) => String.fromCharCode(d.charCodeAt(0) - p0 + l0))
        .replaceAll("٪", "%");
}
