
import uuid from 'uuid';
import { DateTime, DurationObject } from 'luxon';
import dot from 'dotenv';

export function guid() {
    return uuid();
}

export function randomInt(min: string, max: string) {
    return Math.random() * (+max - +min) + (+min);
}

export function timestamp(offset?: string, option?: string) {
    return getDate(offset, option).toMillis();
}

export function datetime(format: string, offset: string, option: string) {
    return formatDate(format, getDate());
}

export function localDateTime(format: string, offset: string, option: string) {
    return formatDate(format, getDate().toLocal());
}

export function processEnv(name: string) {
    return process.env[name];
}

export function dotenv(name: string) {
    return dot.config().parsed?.[name] ?? "";
}

// Move these to utils, write tests.
function getDuration(offset: number, option: string): DurationObject | undefined {
    switch (option) {
        case 'ms':
            return { milliseconds: +offset };
        case 's':
            return { seconds: +offset };
        case 'm':
            return { minutes: +offset };
        case 'h':
            return { hours: +offset };
        case 'd':
            return { days: +offset };
        case 'w':
            return { weeks: +offset };
        case 'M':
            return { months: +offset };
        case 'Q':
            return { quarters: +offset };
        case 'y':
            return { years: +offset };
    }
    return undefined;
}

function getDate(offset?: string, option?: string) {
    let date = DateTime.utc();
    
    if (offset && option) {
        const duration = getDuration(+offset, option);
        
        if (duration) {
            date = date.plus(duration);
        }
    }
    
    return date;
}

function formatDate(format: string, date: DateTime) {
    switch (format) {
        case "rfc1123":
            return date.toHTTP();
        case "iso8601":
            return date.toISO();
        default:
            return date.toFormat(format);
    }
}