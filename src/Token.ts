
export type Method = "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "HEAD" | "OPTIONS";

export type BreakToken =
    { type: "break" };
export type VariableToken =
    { type: "variable", name: string, value: string };
export type SettingToken =
    { type: "setting", name: string, value?: string };
export type RequestToken =
    { type: "request", method: Method, url: string };
export type RequestParamToken =
    { type: "request_param", value: string };
export type HeaderToken =
    { type: "header", name: string, value: string };
export type FileToken =
    { type: "file", path: string };
export type CommentToken =
    { type: "comment" };

export type Token =
    | BreakToken
    | VariableToken
    | SettingToken
    | RequestToken
    | RequestParamToken
    | HeaderToken
    | CommentToken
    | FileToken
;

export type TokenType = Token["type"];

interface TokenRule {
    type: TokenType;
    regex: RegExp;
}

const TOKENS: TokenRule[] = [
    { type: "break", regex: /^###.*$/ },
    { type: "variable", regex: /^@(\w+)\s*=\s*(.+)$/ },
    { type: "setting", regex: /^(?:#+|\/\/+)\s*@(\w+)\s*(\w+)?$/ },
    { type: "comment", regex: /^\s*(?:#|\/\/).*$/ },
    { type: "request_param", regex: /^\s*([&?].+)$/ },
    { type: "request", regex: /^(GET|PUT|PATCH|POST|DELETE|HEAD|OPTIONS)?\s*([^\s]+)\s*(HTTP\/[\d\.]+)?$/ },
    { type: "header", regex: /^([\w_-]+)\s*:\s*(.+)$/ },
    { type: "file", regex: /^<\s+(.+)$/ },
];

export function findToken(line: string): Token | null {
    for (let {regex, type} of TOKENS) {
        let m = regex.exec(line);
        if (!m) continue;
        
        switch (type) {
            case "break":
                return { type };
            case "variable":
                return { type, name: m[1], value: m[2].trim() };
            case "setting":
                return { type, name: m[1].trim(), value: m[2]?.trim() };
            case "request":
                return { type, method: m[1] as Method || "GET", url: m[2].trim() };
            case "request_param":
                return { type, value: m[1].trim() };
            case "header":
                return { type, name: m[1], value: m[2].trim() };
            case "file":
                return { type, path: m[1].trim() };
        }
    }
    return null;
}
