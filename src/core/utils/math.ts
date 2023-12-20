export function toDiffPerc(base: number, value: number) {
    return (value / base - 1) * 100;
}

export function fromDiffPerc(base: number, perc: number) {
    if (!Number.isFinite(perc)) {
        // eslint-disable-next-line no-param-reassign
        perc = 0;
    }
    return base * (1 + perc / 100);
}

export function toValPerc(base: number, value: number) {
    return (value / base) * 100;
}

export function fromValPerc(base: number, perc: number) {
    if (!Number.isFinite(perc)) {
        // eslint-disable-next-line no-param-reassign
        perc = 0;
    }
    return base * (perc / 100);
}
