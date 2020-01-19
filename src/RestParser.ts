
import fs from 'fs-extra';
import { RestRequest } from './RestRequest';
import { findToken, RequestToken } from './Token';
import { VarMap } from './VarMap';

type StringMap = Record<string, string>;

type Step = "init" | "request" | "body" | "file";

export class RestParser {
    
    names: string[] = [];
    requests: RestRequest[] = [];
    vars: VarMap;
    
    constructor() {
        this.names = [];
        this.requests = [];
        this.vars = new VarMap();
    }
    
    public async *get(): AsyncGenerator<RestRequest> {
        for (let req of this.requests) {
            yield await req.fill(this.vars);
        }
    }
    
    public isEmpty() {
        return this.requests.length == 0;
    }
    
    public async readFile(filepath: string) {
        const contents = await fs.readFile(filepath, 'utf-8');
        await this.readString(filepath, contents);
        
    }
    
    public readString(filepath: string, contents: string) {
        const variables: StringMap = {};
        
        for (let part of contents.split(/###+.*\n/)) {
            let step: Step = "init";
            
            const headers: StringMap = {};
            let request: RequestToken | undefined = undefined;
            let body = "";
            let file = "";
            let name = "";
            
            for (let line of part.split(/\n/)) {
                let token = findToken(line);
                
                // variables
                if (token && token.type == "variable" && step == "init") {
                    variables[token.name] = token.value;
                }
                // name
                else if (token && token.type == "name" && step == "init") {
                    name = token.name;
                }
                // request
                else if (token && token.type == "request" && step == "init") {
                    request = token;
                    step = "request";
                }
                // extra request params
                else if (token && token.type == "request_param" && step == "request" && request) {
                    request.url += token.value;
                }
                // headers
                else if (token && token.type == "header" && step == "request") {
                    headers[token.name.toLowerCase()] = token.value;
                    step = "body";
                }
                // file
                else if (token && token.type == "file" && (step == "body" || step == "request")) {
                    file = token.path;
                    step = "file";
                }
                // body
                else if (step == "body" || step == "request") {
                    body += line;
                }
                // error
                else if (token) {
                    console.log(token, step);
                    throw new Error("out of order parsing.");
                }
            }
            
            // no request
            if (!request) continue;
            
            if (this.names.includes(name)) {
                throw new Error("duplicate name: " + name);
            }
            
            this.requests.push(new RestRequest(filepath, {
                method: request.method,
                url: request.url,
                headers: headers,
                name: name || undefined,
                data: body || undefined,
                path: file || undefined,
            }));
        }
        
        this.vars.addVars(variables);
    }
}
