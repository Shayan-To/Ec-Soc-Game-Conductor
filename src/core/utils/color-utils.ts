import tinycolor from "tinycolor2";
import { nullable } from "./type-utils";

/** All components are 0-1. */
export type Color = [r: number, g: number, b: number, a: number];

export function parseColor(value: string) {
    const tc = tinycolor(value);
    if (!tc.isValid()) {
        return null;
    }
    const c = tc.toRgb();
    return [c.r / 255, c.g / 255, c.b / 255, c.a] satisfies Color;
}

export function toStringColor(color: Color) {
    const [r, g, b, a] = fixColor(color);
    const tc = tinycolor.fromRatio({ r, g, b, a });
    return tc.toHex8String();
}

export function fixColorC(value: number) {
    const error = 1e-3;
    if (value < error) {
        return 0;
    }
    if (1 - error < value) {
        return 1;
    }
    return value;
}

export function fixColor(color: Color) {
    const [r, g, b, a] = color;
    return [fixColorC(r), fixColorC(g), fixColorC(b), fixColorC(a)] satisfies Color;
}

// https://en.wikipedia.org/wiki/SRGB#Transformation

/** srgb -> linear */
export function gammaExpandC(value: number) {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return Math.pow((value + 0.055) / 1.055, 2.4);
}

/** srgb -> linear */
export function gammaExpand(color: Color) {
    const [r, g, b, a] = color;
    return [gammaExpandC(r), gammaExpandC(g), gammaExpandC(b), a] satisfies Color;
}

/** linear -> srgb */
export function gammaCompressC(value: number) {
    if (value <= 0.04045 / 12.92) {
        return value * 12.92;
    }
    return Math.pow(value, 1 / 2.4) * 1.055 - 0.055;
}

/** srgb -> linear */
export function gammaCompress(color: Color) {
    const [r, g, b, a] = color;
    return [gammaCompressC(r), gammaCompressC(g), gammaCompressC(b), a] satisfies Color;
}

export function getLuminance(color: Color) {
    const [r, g, b] = gammaExpand(color);
    return gammaCompressC(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

export function grayscale(color: Color) {
    const l = getLuminance(color);
    return [l, l, l, color[3]] satisfies Color;
}

// https://en.wikipedia.org/wiki/Alpha_compositing

/**
 * @param v1 over
 * @param v2 under
 */
export function compositeOverC(v1: number, v2: number) {
    return v1 + v2 * (1 - v1);
}

/**
 * @param c1 over
 * @param c2 under
 */
export function compositeOver(c1: Color, c2: Color) {
    const [r1, g1, b1, a1] = gammaExpand(c1);
    const [r2, g2, b2, a2] = gammaExpand(c2);

    const a = compositeOverC(a1, a2);
    if (a === 0) {
        return [0, 0, 0, 0] satisfies Color;
    }
    return gammaCompress([
        compositeOverC(r1 * a1, r2 * a2) / a,
        compositeOverC(g1 * a1, g2 * a2) / a,
        compositeOverC(b1 * a1, b2 * a2) / a,
        a,
    ]);
}

export function blendLinearC(v1: number, v2: number, m: number) {
    return v1 * (1 - m) + v2 * m;
}

export function blendLinear(c1: Color, c2: Color, m: number) {
    const [r1, g1, b1, a1] = c1;
    const [r2, g2, b2, a2] = c2;
    return [
        blendLinearC(r1, r2, m),
        blendLinearC(g1, g2, m),
        blendLinearC(b1, b2, m),
        blendLinearC(a1, a2, m),
    ] satisfies Color;
}

export function blendLogC(v1: number, v2: number, m: number) {
    return (v1 ** 2 * (1 - m) + v2 ** 2 * m) ** 0.5;
}

export function blendLog(c1: Color, c2: Color, m: number) {
    const [r1, g1, b1, a1] = c1;
    const [r2, g2, b2, a2] = c2;
    return [
        blendLogC(r1, r2, m),
        blendLogC(g1, g2, m),
        blendLogC(b1, b2, m),
        blendLogC(a1, a2, m),
    ] satisfies Color;
}

export function withAlpha(c: Color, a: number) {
    const [r, g, b] = c;
    return [r, g, b, a] as Color;
}

export function getElementBgFg(element: HTMLElement) {
    let bg: Color = [0, 0, 0, 0];
    let fg: Color;

    let el = nullable(element);
    while (el) {
        const styles = window.getComputedStyle(el);

        fg ??= parseColor(styles.color)!;

        const b = parseColor(styles.backgroundColor);
        if (b) {
            bg = compositeOver(b, bg);
            if (fixColorC(bg[3]) === 1) {
                break;
            }
        }

        el = el.parentElement;
    }

    return { fg: fg!, bg };
}
