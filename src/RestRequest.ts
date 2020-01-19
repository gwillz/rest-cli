
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { Method } from "./Token";
import { VarMap } from './VarMap';
import { Entity } from './Entity';
import { HeaderMap } from './HeaderMap';

type StringMap = Record<string, string>;

interface Props {
    method: Method;
    url: string;
    headers: StringMap | HeaderMap;
    path?: string;
    data?: Buffer | string;
    name?: string;
}

export class RestRequest {
    method: Method;
    url: string;
    headers: HeaderMap;
    body: string | Buffer | null;
    
    sourcePath: string;
    filePath?: string;
    name?: string;
    
    constructor(sourcePath: string, props: Props) {
        this.sourcePath = sourcePath;
        this.method = props.method;
        this.url = props.url;
        this.headers = HeaderMap.from(props.headers);
        
        this.body = props.data ?? null;
        this.filePath = props.path;
        this.name = props.name;
    }
    
    public async fill(vars: VarMap): Promise<RestRequest> {
        
        let body: Buffer | string | null;
        
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
            headers: this.headers.fill(vars),
            data: body ?? undefined,
            path: this.filePath,
            name: this.name,
        });
    }
    
    public async request(): Promise<Entity> {
        const { method, headers, url, body: data } = this;
        
        const res = await axios.request({
            url, method, headers, data,
            transformResponse: res => res,
        });
        
        return new Entity(this, res);
    }
    
    public toString() {
        return `${this.method.padEnd(6)} ${this.url}`;
    }
}
