
import { DurationObject, DateTime } from 'luxon';
import { Response, Headers } from 'node-fetch';

export type StringMap = Record<string, string>;

export class ServerError extends Error {
    
    readonly name: "ServerError";
    readonly url: string;
    readonly status: number;
    readonly response: Response;
    
    constructor(url: string, res: Response) {
        super(res.statusText);
        this.name = "ServerError";
        this.url = url;
        this.status = res.status;
        this.response = res;
    }
}

export function isServerError(test: any): test is ServerError {
    return !!test && test.name === "ServerError";
}

export function tuple<T extends any[]> (...data: T) {
    return data;
}


export function bodyAsString(body: unknown): string {
    if (!body) {
        return "";
    }
    else if (isBuffer(body)) {
        return body.toString("utf-8");
    }
    else if (typeof body !== "string") {
        return body + "";
    }
    else {
        return body;
    }
}


export function headersAsString(headers: Headers): string {
    let out = "";
    
    for (let [name, value] of headers) {
        out += `${capitalise(name, '-')}: ${value}\n`;
    }
    
    return out;
}


export function isBuffer(test: any): test is Buffer {
    return (
        !!test &&
        test.constructor?.name === "Buffer"
    );
}


export function safeParseJson(body: string): any {
    try {
        return JSON.parse(body);
    }
    catch (error) {
        console.warn("Not a JSON body.\n" + error.message);
        return null;
    }
}

type Args = {
    node: string;
    script: string;
    options: StringMap;
    args: string[];
}

export function getArgs(flags: string[] = [], argv = process.argv): Args {
    const [node, script, ...rest] = argv;
    
    const options: StringMap = {};
    const args: string[] = [];
    
    let name: undefined | string;
    
    for (let arg of rest) {
        const m = /^-+(.+)$/.exec(arg);
        
        if (m) {
            name = m[1];
            options[name] = "true";
            
            if (flags.includes(name)) {
                name = undefined;
            }
        }
        else if (name) {
            options[name] = arg;
            name = undefined;
        }
        else {
            args.push(arg);
        }
    }
    
    return { node, script, options, args };
}


export async function retry(attempts: number, cb: (attempt: number) => void | Promise<void>) {
    let attempt = 1;
    for (;;) {
        try {
            await cb(attempt);
            break;
        }
        catch (error) {
            if (attempt == attempts) {
                throw error;
            }
        }
        attempt++;
    }
}


export function capitalise(input: string, delimiter = " ") {
    return input
        .split(delimiter)
        .map(word => (
            word.slice(0, 1).toUpperCase() +
            word.slice(1).toLowerCase()
        ))
        .join(delimiter);
}

export function getDuration(offset: number, option: string): DurationObject | undefined {
    switch (option) {
        case 'ms':
            return { milliseconds: offset };
        case 's':
            return { seconds: offset };
        case 'm':
            return { minutes: offset };
        case 'h':
            return { hours: offset };
        case 'd':
            return { days: offset };
        case 'w':
            return { weeks: offset };
        case 'M':
            return { months: offset };
        case 'Q':
            return { quarters: offset };
        case 'y':
            return { years: offset };
    }
    return undefined;
}

export function getOffset(date: DateTime, offset?: string, option?: string) {
    if (offset && option) {
        const duration = getDuration(+offset, option);
        
        if (duration) {
            date = date.plus(duration);
        }
    }
    
    return date;
}

export function formatDate(date: DateTime, format: string) {
    switch (format) {
        case "rfc1123":
            return date.toHTTP();
        case "iso8601":
            return date.toISO();
        default:
            return date.toFormat(format);
    }
}

export function basicAuth(username: string, password: string) {
    const base64 = Buffer.from(username + ':' + password).toString('base64');
    return 'Basic ' + base64;
}
