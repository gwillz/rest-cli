
import { Response } from "node-fetch";

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
