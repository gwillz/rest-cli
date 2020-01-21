
import { RestRequest } from "./RestRequest";
import { Response, Headers } from "node-fetch";
import { bodyAsString } from "./utils";

export type EntityMap = Record<string, Entity>;

export interface EntityRequest {
    body: string | Buffer | undefined;
    headers: Headers;
    getBody: () => string;
}

export interface EntityResponse {
    body: Buffer;
    headers: Headers;
    statusText: string;
    status: number;
    getBody: () => string;
}

type Props = {
    name?: string;
    request: EntityRequest;
    response: EntityResponse;
}

export class Entity {
    
    readonly name?: string;
    readonly request: EntityRequest;
    readonly response: EntityResponse;
    
    constructor(props: Props) {
        this.name = props.name;
        this.request = props.request;
        this.response = props.response;
    }
    
    public static async from(request: RestRequest, res: Response): Promise<Entity> {
        const name = request.name;
        
        const response = {
            body: await res.buffer(),
            headers: res.headers,
            statusText: res.statusText,
            status: res.status,
            getBody() {
                return bodyAsString(this.body);
            }
        };
        
        return new Entity({ name, request, response });
    }
}
