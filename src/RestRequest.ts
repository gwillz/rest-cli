
import path from 'path';
import fs from 'fs-extra';
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
    path?: string;
    body?: Buffer | string;
    name?: string;
}

export class RestRequest {
    method: Method;
    url: string;
    headers: Headers;
    body: string | Buffer | undefined;
    
    sourcePath: string;
    filePath?: string;
    name?: string;
    
    constructor(sourcePath: string, props: Props) {
        this.sourcePath = sourcePath;
        this.method = props.method;
        this.url = props.url;
        this.headers = new Headers(props.headers);
        
        this.body = props.body;
        this.filePath = props.path;
        this.name = props.name;
    }
    
    public async fill(vars: VarMap): Promise<RestRequest> {
        
        let body: Buffer | string | undefined;
        
        // load file
        if (this.filePath && !this.body) {
            const root = path.dirname(this.sourcePath);
            const filepath = path.resolve(root, this.filePath);
            body = await fs.readFile(filepath);
        }
        else if (typeof this.body === "string") {
            body = vars.replace(this.body);
        }
        else {
            body = this.body;
        }
        
        // remap variables.
        return new RestRequest(this.sourcePath, {
            method: this.method,
            url: vars.replace(this.url),
            headers: vars.replaceHeaders(this.headers),
            body: body,
            path: this.filePath,
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
    
    public getFileName() {
        return path.basename(this.sourcePath);
    }
    
    public getSlug(): string {
        return `${this.method} ${this.url}`;
    }
    
    public getBody(): string {
        return bodyAsString(this.body, this.headers.get("content-type"));
    }
}
