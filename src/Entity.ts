
import { StringMap, bodyAsString } from "./utils";
import { RestRequest } from "./RestRequest";
import { AxiosResponse } from "axios";

interface EntityRequest {
    body: string | Buffer | null;
    headers: StringMap;
}

interface EntityResponse {
    body: any;
    headers: StringMap;
    statusText: string;
    status: number;
}

export type EntityMap = Record<string, Entity>;

export class Entity {
    
    request: EntityRequest;
    response: EntityResponse;
    
    constructor(req: RestRequest, res: AxiosResponse) {
        this.request = {
            body: req.body,
            headers: req.headers,
        };
        this.response = {
            body: res.data,
            headers: res.headers,
            statusText: res.statusText,
            status: res.status,
        };
    }
    
    public toString(): string {
        const { body, headers, status, statusText } = this.response;
        let out = "";
        
        out += `HTTP/1.1 ${status} ${statusText}\n`;
        
        for (let [name, value] of Object.entries(headers)) {
            out += `${name}: ${value}\n`;
        }
        
        out += "\n";
        out += bodyAsString(body);
        out += "\n";
        
        return out;
    }
}
