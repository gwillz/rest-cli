
import path from 'path';
import fs from './fs';
import fetch, { Headers } from 'node-fetch';
import { Method } from "./Token";
import { VarMap } from './VarMap';
import { bodyAsString, StringMap } from './utils';
import { ServerError } from './ServerError';
import { Entity } from './Entity';


interface Props {
    method: Method;
    url: string;
    headers: StringMap | Headers;
    filePath?: string;
    body?: Buffer | string;
    name?: string;
    settings?: RequestSettings;
}

// TODO Fill this in with fixed names.
// TODO Convert from rest-client names (defined in Settings).
export interface RequestSettings extends Record<string, string | undefined> {}

export class RestRequest {
    method: Method;
    url: string;
    headers: Headers;
    body: string | Buffer | undefined;
    
    filePath?: string;
    settings: RequestSettings;
    
    constructor(props: Props) {
        this.method = props.method;
        this.url = props.url;
        this.headers = new Headers(props.headers);
        
        this.body = props.body;
        this.filePath = props.filePath;
        this.settings = props.settings || {};
    }
    
    public async fill(sourcePath: string, vars: VarMap): Promise<RestRequest> {
        
        let body: Buffer | string | undefined;
        
        // load file
        if (this.filePath && !this.body) {
            const root = path.dirname(sourcePath);
            const fullPath = path.resolve(root, this.filePath);
            body = await fs.readFile(fullPath);
        }
        else if (typeof this.body === "string") {
            body = vars.replace(this.body);
        }
        else {
            body = this.body;
        }
        
        // remap variables.
        return new RestRequest({
            method: this.method,
            url: vars.replace(this.url),
            headers: vars.replaceHeaders(this.headers),
            body: body,
            filePath: this.filePath,
            settings: this.settings,
        });
    }
    
    public async request(): Promise<Entity> {
        const { method, headers, url, body } = this;
        
        const res = await fetch(url, {
            body,
            headers,
            method,
        });
        
        if (!res.ok) throw new ServerError(url, res);
        
        return await Entity.from(this, res);
    }
    
    public get name(): string | undefined {
        return this.settings.name;
    }
    
    public getSlug(): string {
        return `${this.method} ${this.url}`;
    }
    
    public getBody(): string {
        return bodyAsString(this.body);
    }
}
