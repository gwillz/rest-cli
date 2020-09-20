
import { RestRequest, RequestSettings } from "./RestRequest";
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
    settings: RequestSettings;
    request: EntityRequest;
    response: EntityResponse;
}

export class Entity {
    
    readonly settings: RequestSettings;
    readonly request: EntityRequest;
    readonly response: EntityResponse;
    
    constructor(props: Props) {
        this.settings = props.settings;
        this.request = props.request;
        this.response = props.response;
    }
    
    public get name() {
        return this.settings.name;
    }
    
    public static async from(request: RestRequest, res: Response): Promise<Entity> {
        const { settings } = request;
        
        const response = {
            body: await res.buffer(),
            headers: res.headers,
            statusText: res.statusText,
            status: res.status,
            getBody() {
                return bodyAsString(this.body);
            }
        };
        
        return new Entity({ settings, request, response });
    }
}
