
import { RestRequest } from "./RestRequest";
import { Response, Headers } from "node-fetch";

export interface EntityRequest {
    body: string | Buffer | undefined;
    headers: Headers;
}

export interface EntityResponse {
    body: any;
    headers: Headers;
    statusText: string;
    status: number;
}

export type EntityMap = Record<string, Entity>;

type Props = {
    request: EntityRequest;
    response: EntityResponse;
}

export class Entity {
    
    request: EntityRequest;
    response: EntityResponse;
    
    constructor(props: Props) {
        this.request = props.request;
        this.response = props.response;
    }
    
    public static async from(req: RestRequest, res: Response): Promise<Entity> {
        
        const request = {
            body: req.body,
            headers: req.headers,
        };
        
        const response = {
            body: await res.buffer(),
            headers: res.headers,
            statusText: res.statusText,
            status: res.status,
        };
        
        return new Entity({ request, response });
    }
}
