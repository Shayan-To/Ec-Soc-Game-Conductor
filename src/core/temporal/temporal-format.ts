import { Intl, Temporal } from "@js-temporal/polyfill";
import { omitFromObject, setDefaults } from "~/core/utils";
import { objectToConsistentString } from "~/core/utils/serialization";
import {
    createExactObjectOf,
    forceType,
    type PartialRecord,
    type TypedOmit,
    type ValueOf,
} from "~/core/utils/type-utils";

const numericDateTimeTweakPart: TweakPart = (p) => {
    if (p.type === "literal") {
        if (p.value.indexOf(",") !== -1 || p.value.indexOf("،") !== -1) {
            return " ";
        }
        if (p.value === "-") {
            return "/";
        }
    }
    return p.value;
};

const dateTimeFormatOptionsPresets = createExactObjectOf<DateTimeFormatRawOptions>()({
    "narrow-date-time": {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        tweakPart: numericDateTimeTweakPart,
    },
    "short-date-time": {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        tweakPart: numericDateTimeTweakPart,
    },
    "medium-date-time": {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    },
    "full-date-time": {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
    },
    "narrow-date": {
        month: "2-digit",
        day: "2-digit",
    },
    "short-date": {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    },
    "medium-date": {
        year: "numeric",
        month: "short",
        day: "numeric",
    },
    "full-date": {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
    },
    time: {
        hour: "2-digit",
        minute: "2-digit",
    },
    "time-with-seconds": {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    },
    "no-year": {
        year: undefined,
    },
});

export type DateTimeFormatPresets = keyof typeof dateTimeFormatOptionsPresets;

type Tweak = (str: string) => string;
type TweakPart = (part: globalThis.Intl.DateTimeFormatPart) => string;

type DateTimeFormatAdditionalOptions = {
    tweak: Tweak;
    tweakPart: TweakPart | undefined;
    enforce2Digits: boolean;
};

type DateTimeFormatFinalOptions = Intl.DateTimeFormatOptions &
    Partial<DateTimeFormatAdditionalOptions>;

export type DateTimeFormatRawOptions = TypedOmit<
    DateTimeFormatFinalOptions,
    "calendar" | "timeZone"
>;

export type DateTimeFormatOptions =
    | DateTimeFormatPresets
    | DateTimeFormatPresets[]
    | DateTimeFormatRawOptions;

type Formatter = {
    dateTimeFormat: Intl.DateTimeFormat;
    numberFormat: globalThis.Intl.NumberFormat;
    options: DateTimeFormatFinalOptions & DateTimeFormatAdditionalOptions;
};

const dateTimeFormatCache: {
    [key in string]?: Formatter;
} = {};

const additionalDefaults: DateTimeFormatAdditionalOptions = {
    tweak(s) {
        return s;
    },
    tweakPart: undefined,
    enforce2Digits: true,
};

function getFormatter(options: DateTimeFormatOptions = {}) {
    if (typeof options === "string") {
        // eslint-disable-next-line no-param-reassign
        options = dateTimeFormatOptionsPresets[options];
    }

    if (Array.isArray(options)) {
        // eslint-disable-next-line no-param-reassign
        options = (Object.assign as <T>(t: T, ...s: T[]) => T)(
            {} as DateTimeFormatRawOptions,
            ...options.map((o) => dateTimeFormatOptionsPresets[o]),
        );
    }

    const finalOptions: DateTimeFormatFinalOptions = {
        hour12: false,
        ...options,
        calendar: "persian",
        timeZone: "Asia/Tehran",
    };

    setDefaults(finalOptions, additionalDefaults);

    const formatOptions = omitFromObject(
        finalOptions,
        ...(Object.keys as <T>(o: T) => (keyof T)[])(additionalDefaults),
    );

    const key = `fa!${objectToConsistentString(formatOptions)}`;

    const cacheValue = dateTimeFormatCache[key];
    if (cacheValue !== undefined) {
        cacheValue.options.enforce2Digits = finalOptions.enforce2Digits;
        return cacheValue;
    }

    return (dateTimeFormatCache[key] = {
        dateTimeFormat: new Intl.DateTimeFormat("fa", formatOptions),
        numberFormat: new globalThis.Intl.NumberFormat("fa"),
        options: finalOptions,
    });
}

function internalFormatToParts(formatter: Formatter, date?: number | Intl.Formattable) {
    const parts = formatter.dateTimeFormat.formatToParts(date);

    if (formatter.options.enforce2Digits) {
        const zero = formatter.numberFormat.format(0);
        forceType<PartialRecord<keyof any, ValueOf<typeof formatter.options>>>(formatter.options);
        for (const p of parts) {
            if (formatter.options[p.type] === "2-digit") {
                p.value = p.value.padStart(2, zero);
            }
        }
    }

    if (formatter.options.tweakPart) {
        for (const p of parts) {
            p.value = formatter.options.tweakPart(p);
        }
    }

    return parts;
}

export namespace TemporalFormat {
    export function format(
        date?: Parameters<Intl.DateTimeFormat["format"]>[0],
        options?: DateTimeFormatOptions,
    ): ReturnType<Intl.DateTimeFormat["format"]> {
        const formatter = getFormatter(options);
        const parts = internalFormatToParts(formatter, date);
        return formatter.options.tweak(parts.map((p) => p.value).join(""));
    }

    export function formatToParts(
        date?: Parameters<Intl.DateTimeFormat["formatToParts"]>[0],
        options?: DateTimeFormatOptions,
    ): ReturnType<Intl.DateTimeFormat["formatToParts"]> {
        const formatter = getFormatter(options);
        return internalFormatToParts(formatter, date);
    }

    export function unFormat(date: string, format: DateTimeFormatOptions) {
        if (format === "short-date") {
            const regex = /^(\d{4})\/(\d{2})\/(\d{2})/;
            const [, year, month, day] = (regex.exec(date) || []).map((v) => parseInt(v));
            if (!year || !month || !day) {
                return null;
            }
            return Temporal.ZonedDateTime.from({
                timeZone: "Asia/Tehran",
                calendar: "persian",
                year,
                month,
                day,
            });
        } else if (format === "short-date-time") {
            const regex = /^(\d{4})\/(\d{2})\/(\d{2})\s*(\d{2}):(\d{2})/;
            const [, year, month, day, hour, minute] = (regex.exec(date) || []).map((v) =>
                parseInt(v),
            );
            if (!year || !month || !day || !hour || !minute) {
                return null;
            }
            return Temporal.ZonedDateTime.from({
                timeZone: "Asia/Tehran",
                calendar: "persian",
                year,
                month,
                day,
                hour,
                minute,
            });
        }
        return null;
    }
}
