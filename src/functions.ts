
import uuid from 'uuid';
import dot from 'dotenv';
import { formatDate, getOffset } from './utils';
import { DateTime } from 'luxon';

export function guid() {
    return uuid();
}

export function randomInt(min: string, max: string) {
    return Math.random() * (+max - +min) + (+min);
}

export function timestamp(offset?: string, option?: string) {
    return getOffset(DateTime.utc(), offset, option).toMillis();
}

export function datetime(format: string, offset: string, option: string) {
    return formatDate(getOffset(DateTime.utc(), offset, option), format);
}

export function localDateTime(format: string, offset: string, option: string) {
    return formatDate(getOffset(DateTime.local(), offset, option), format);
}

export function processEnv(name: string) {
    return process.env[name];
}

export function dotenv(name: string) {
    return dot.config().parsed?.[name] ?? "";
}
