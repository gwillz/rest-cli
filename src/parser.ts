
import path from 'path';
import fs from 'fs-extra';

function fillVariables(variables: StringMap, text: string) {
    for (let [name, value] of Object.entries(variables)) {
        text = text.replace(`{{${name}}}`, value);
    }
    return text;
}

function fillMapVariables(variables: StringMap, map: StringMap) {
    const copy: StringMap = {};
    
    for (let [name, value] of Object.entries(map)) {
        copy[name] = fillVariables(variables, value);
    }
    return copy;
}

interface Options {
    sourcePath: string;
    method: Method;
    url: string;
    headers: StringMap;
    path?: string;
    body?: string;
    // blob?: Buffer;
    name?: string;
}

class HttpRequest {
    method: Method;
    url: string;
    headers: StringMap;
    body: string | null;
    blob: Buffer | null;
    
    sourcePath: string;
    filePath: string | null;
    
    constructor(options: Options) {
        this.sourcePath = options.sourcePath;
        this.method = options.method;
        this.url = options.url;
        this.headers = options.headers;
        
        this.filePath = options.path ?? null;
        this.body = options.body ?? null;
        this.blob = null;
    }
    
    public async loadFile() {
        if (this.filePath && this.blob == null) {
            let root = path.dirname(this.sourcePath);
            this.blob = await fs.readFile(path.resolve(root, this.filePath));
        }
    }
    
    public async fill(variables: StringMap): Promise<HttpRequest> {
        return new HttpRequest({
            sourcePath: this.sourcePath,
            method: this.method,
            url: fillVariables(variables, this.url),
            headers: fillMapVariables(variables, this.headers),
            body: this.body ? fillVariables(variables, this.body) : undefined,
            path: this.filePath ?? undefined,
        });
    }
    
    toString() {
        let out = "";
        
        out += `${this.method} ${this.url} HTTP/1.1\n`;
        for (let [name, value] of Object.entries(this.headers)) {
            out += `${name}: ${value}\n`;
        }
        out += this.filePath ?? this.body;
        out += "\n";
        
        return out;
    }
}

type StringMap = Record<string, string>;

type Method = "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "HEAD" | "OPTIONS";

type VariableToken =
    { type: "variable", name: string, value: string };
type NameToken =
    { type: "name", name: string };
type RequestToken =
    { type: "request", method: Method, url: string };
type RequestParamToken =
    { type: "request_param", value: string };
type HeaderToken =
    { type: "header", name: string, value: string };
type FileToken =
    { type: "file", path: string };

type Token =
    | VariableToken
    | NameToken
    | RequestToken
    | RequestParamToken
    | HeaderToken
    | FileToken
;

type TokenType = Token["type"];

interface TokenRule {
    type: TokenType;
    regex: RegExp;
}

const TOKENS: TokenRule[] = [
    { type: "variable", regex: /^@(\w+)\s*=\s*(.+)$/ },
    { type: "name", regex: /^(?:[#/]+\s+)?@name\s*=\s*([\w_-])$/ },
    { type: "request", regex: /^(GET|PUT|PATCH|POST|DELETE|HEAD|OPTIONS)?\s*([^\s]+)\s*(HTTP\/\d\.\d)?$/ },
    { type: "request_param", regex: /\s*[&?](.+)$/ },
    { type: "header", regex: /^([\w_-]+):\s*(.+)$/ },
    { type: "file", regex: /^>\s+(.+)$/ },
];

function findToken(line: string): Token | null {
    for (let {regex, type} of TOKENS) {
        let m = regex.exec(line);
        if (!m) continue;
        
        switch (type) {
            case "variable":
                return { type, name: m[1], value: m[2] };
            case "name":
                return { type, name: m[1] };
            case "request":
                return { type, method: m[1] as Method || "GET", url: m[2] };
            case "request_param":
                return { type, value: m[1] };
            case "header":
                return { type, name: m[1], value: m[2] };
            case "file":
                return { type, path: m[1] };
        }
    }
    return null;
}

type Step = "init" | "request" | "body" | "file";


export class Parser {
    
    filepath: string;
    requests: HttpRequest[];
    variables: StringMap;
    
    constructor(filepath: string) {
        this.requests = [];
        this.variables = {};
        this.filepath = path.normalize(filepath);
    }
    
    public async *[Symbol.iterator](): AsyncGenerator<HttpRequest> {
        for (let request of this.requests) {
            yield await request.fill(this.variables);
        }
    }
    
    public async load() {
        const content = await fs.readFile(this.filepath, 'utf-8');
        this.parse(content);
    }
    
    public parse(file: string) {
        for (let part of file.split(/###+/)) {
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
                    this.variables[token.name] = token.value;
                }
                // name
                if (token && token.type == "name" && step == "init") {
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
                    headers[token.name] = token.value;
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
                    throw new Error("gah");
                }
            }
            
            // no request
            if (!request) continue;
            
            this.requests.push(new HttpRequest({
                sourcePath: this.filepath,
                method: request.method,
                url: request.url,
                headers: headers,
                name: name || undefined,
                body: body || undefined,
                path: file || undefined,
            }));
        }
        
        this.variables = fillMapVariables(this.variables, this.variables);
    }
}


if (require.main === module) {
    main();
}

async function main() {
    const filepath = path.resolve(process.argv[2]);
    
    const parser = new Parser(filepath);
    
    await parser.load();
    
    for (let request of parser.requests) {
        const req = await request.fill(parser.variables);
        // console.log(request.toString());
        console.log(req.toString());
    }
}
