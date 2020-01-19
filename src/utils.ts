
import { AxiosError } from 'axios';

export type StringMap = Record<string, string>;

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


export function isBuffer(test: unknown): test is Buffer {
    return (
        typeof test === "object" && 
        !!test &&
        test.constructor.name === "Buffer"
    );
}


export function isAxiosError(test: any): test is AxiosError {
    return !!test && test.isAxiosError;
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
