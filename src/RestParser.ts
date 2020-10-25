
import fs from './fs';
import { RestRequest } from './RestRequest';
import { findToken, RequestToken } from './Token';
import { VarMap } from './VarMap';
import { RestFile } from './RestFile';
import { StringMap } from './utils';
import { Settings } from './Settings';

type Step = "init" | "request" | "body" | "file";

type ParserOptions = {
    env: string;
    settings: Settings;
}

export class RestParser {

    files: RestFile[];
    count: number;
    options: ParserOptions;

    constructor(options: Partial<ParserOptions> = {}) {
        this.files = [];
        this.count = 0;
        this.options = {
            env: '$shared',
            settings: new Settings(),
            ...options,
        };
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
        
        // Chuck in those environment variables.
        vars.addGlobals(this.options.settings.getEnvironment(this.options.env));
        
        // Line iterator.
        // Explicitly not using a for-range here because I wrote a weird double
        // loop thing and it works and I really can't be arsed re-writing it.
        // This retains a 'line cursor' across the inner loops, so we can parse
        // many requests from a single file.
        const lines = (function*() {
            const lines = contents.split(/[\r\n]+/);
            for (let line of lines) yield line;
        })();
        
        // Parse requests.
        // Each loop is one request.
        let eof = false;
        while (!eof) {
            let step: Step = "init";

            const headers: StringMap = {};
            const settings: StringMap = {};
            let request: RequestToken | undefined = undefined;
            let body = "";
            let filePath = "";
            
            // Parse lines of a single request.
            while (true) {
                const line = lines.next();
                
                // We're out of data.
                // Stop parsing lines and let the request loop tidy things up.
                if (line.done) {
                    eof = true;
                    break;
                };
                
                let token = findToken(line.value);
                
                // This request is done, we're moving on.
                if (token && token.type == "break") {
                    break;
                }
                
                // variables
                if (token && token.type == "variable" && step == "init") {
                    vars.addVar(token.name, token.value);
                }
                // settings
                else if (token && token.type == "setting" && step == "init") {
                    settings[token.name] = token.value || '';
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
                    if (body || line.value) {
                        body += line.value + "\n";
                    }
                }
                // error
                else if (token) {
                    console.log(token, step);
                    throw new Error("out of order parsing.");
                }
            }

            // no request
            if (!request) continue;

            if (settings.name) {
                if (names.includes(settings.name)) {
                    throw new Error("duplicate name: " + settings.name);
                }
                else {
                    names.push(settings.name);
                }
            }

            requests.push(new RestRequest({
                method: request.method,
                url: request.url,
                headers: headers,
                settings: settings,
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
