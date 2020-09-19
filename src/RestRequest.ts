
import path from 'path';
import fs from './fs';
import fetch, { Headers } from 'node-fetch';
import { Method } from "./Token";
import { VarMap } from './VarMap';
import { bodyAsString } from './utils';
import { ServerError } from './ServerError';
import { Entity } from './Entity';

type StringMap = Record<string, string>;

interface Props {
    method: Method;
    url: string;
    headers: StringMap | Headers;
    filePath?: string;
    body?: Buffer | string;
    name?: string;
}

export class RestRequest {
    method: Method;
    url: string;
    headers: Headers;
    body: string | Buffer | undefined;
    
    filePath?: string;
    name?: string;
    
    constructor(props: Props) {
        this.method = props.method;
        this.url = props.url;
        this.headers = new Headers(props.headers);
        
        this.body = props.body;
        this.filePath = props.filePath;
        this.name = props.name;
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
            name: this.name,
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
    
    public getSlug(): string {
        return `${this.method} ${this.url}`;
    }
    
    public getBody(): string {
        return bodyAsString(this.body);
    }
}
