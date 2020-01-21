
import path from 'path';
import { RestRequest } from "./RestRequest";
import { VarMap } from "./VarMap";

type Props = {
    filePath: string;
    requests: RestRequest[];
    vars: VarMap;
}

export class RestFile {
    
    filePath: string;
    names: Record<string, number>;
    requests: RestRequest[];
    vars: VarMap;
    
    constructor(props: Props) {
        this.filePath = props.filePath;
        this.vars = props.vars;
        this.requests = props.requests;
        this.names = {};
        
        let index = 0;
        for (let req of props.requests) {
            if (req.name) {
                this.names[req.name] = index;
            }
            index++;
        }
    }
    
    public async *[Symbol.asyncIterator](): AsyncGenerator<RestRequest> {
        for (let req of Object.values(this.requests)) {
            yield await req.fill(this.filePath, this.vars);
        }
    }
    
    public async get(name: string | number): Promise<RestRequest | null> {
        const req = this._get(name);
        return req
            ? await req.fill(this.filePath, this.vars)
            : null;
    }
    
    private _get(name: string | number): RestRequest | undefined {
        if (typeof name === "string") {
            const index = this.names[name];
            return this.requests[index];
        }
        else {
            return this.requests[name];
        }
    }
    
    public getFileName() {
        return path.basename(this.filePath, ".http");
    }
}
