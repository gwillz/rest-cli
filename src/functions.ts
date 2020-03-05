
import uuid from 'uuid';
import dot from 'dotenv';
import { formatDate, getOffset } from './utils';
import { DateTime } from 'luxon';

export function guid() {
    return uuid();
}

export function randomInt(min?: string, max?: string) {
    if (min === void 0 || max === void 0) {
        throw new Error("randomInt requires 'min', 'max'.");
    }
    return Math.random() * (+max - +min) + (+min) + "";
}

export function timestamp(offset?: string, option?: string) {
    if (offset != void 0 && option == void 0) {
        throw new Error("timestamp missing [offset option].");
    }
    return getOffset(DateTime.utc(), offset, option).toMillis() + "";
}

export function datetime(format?: string, offset?: string, option?: string) {
    if (format == void 0) {
        throw new Error("datetime requires 'format'.");
    }
    if (offset != void 0 && option == void 0) {
        throw new Error("datetime missing [offset option].");
    }

    return formatDate(getOffset(DateTime.utc(), offset, option), format);
}

export function localDatetime(format?: string, offset?: string, option?: string) {
    if (format == void 0) {
        throw new Error("localDatetime requires 'format'.");
    }
    if (offset != void 0 && option == void 0) {
        throw new Error("localDatetime missing [offset option].");
    }
    return formatDate(getOffset(DateTime.local(), offset, option), format);
}

export function processEnv(name?: string) {
    if (name == void 0) {
        throw new Error("processEnv requires 'name'.");
    }
    return process.env[name] ?? "";
}

export function dotenv(name?: string) {
    if (name == void 0) {
        throw new Error("dotenv requires 'name'.");
    }
    return dot.config().parsed?.[name] ?? "";
}

type GenericFn = (...args: string[]) => string;

const fns: Record<string, GenericFn> = {
    guid,
    randomInt,
    timestamp,
    datetime,
    localDatetime,
    processEnv,
    dotenv,
};

type FnName = keyof typeof fns;

export function isFunction(test: any): test is FnName {
    return test in fns;
}

export default fns;
