
import fs from 'fs-extra';
import { RestRequest } from './RestRequest';
import { findToken, RequestToken } from './Token';
import { VarMap } from './VarMap';
import { RestFile } from './RestFile';
import { StringMap } from './utils';

type Step = "init" | "request" | "body" | "file";


export class RestParser {

    files: RestFile[];
    count: number;

    constructor() {
        this.files = [];
        this.count = 0;
    }

    public async get(name: string | number): Promise<RestRequest | null> {
        for (let file of this.files) {
            const req = await file.get(name);
            if (req) return req;
        }

        return null;
    }

    public *[Symbol.iterator](): Generator<RestFile> {
        for (let file of this.files) {
            yield file;
        }
    }

    public size() {
        return this.count;
    }

    public isEmpty() {
        return this.size() == 0;
    }

    public async readFile(filePath: string) {
        const contents = await fs.readFile(filePath, 'utf-8');
        this.readString(filePath, contents);
    }

    public readString(filePath: string, contents: string) {

        const vars = new VarMap();
        const names: string[] = [];
        const requests: RestRequest[] = [];

        for (let part of contents.split(/###+.*\n/)) {
            let step: Step = "init";

            const headers: StringMap = {};
            let request: RequestToken | undefined = undefined;
            let body = "";
            let filePath = "";
            let name = "";

            for (let line of part.split(/[\n\r]+/)) {
                let token = findToken(line);

                // variables
                if (token && token.type == "variable" && step == "init") {
                    vars.addVar(token.name, token.value);
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
                else if (token && token.type == "header" && (step == "request" || step == "body")) {
                    headers[token.name.toLowerCase()] = token.value;
                    step = "body";
                }
                // file
                else if (token && token.type == "file" && (step == "request" || step == "body")) {
                    filePath = token.path;
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

            if (name) {
                if (names.includes(name)) {
                    throw new Error("duplicate name: " + name);
                }
                else {
                    names.push(name);
                }
            }

            requests.push(new RestRequest({
                method: request.method,
                url: request.url,
                headers: headers,
                name: name || undefined,
                body: body || undefined,
                filePath: filePath || undefined,
            }));

            this.count++;
        }

        this.files.push(new RestFile({
            filePath,
            requests,
            vars,
        }))
    }
}
