export function checkNationalId(code: string) {
    if (code.length !== 10) {
        return false;
    }
    let sum = 0;
    for (let i = 0; i < code.length - 1; i += 1) {
        sum += +code.charAt(i) * (code.length - i);
    }
    sum %= 11;
    return +code.charAt(code.length - 1) === (sum < 2 ? sum : 11 - sum);
}
