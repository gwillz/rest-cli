
import xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { JSONPath } from 'jsonpath-plus';
import { safeParseJson, basicAuth, bodyAsString, StringMap } from './utils';
import { EntityMap, Entity } from './Entity';
import { Headers } from 'node-fetch';
import FUNCTIONS, { isFunction } from './functions';

type Props = {
    variables?: StringMap,
    entities?: EntityMap;
}

const RE = /{{([^}]+)}}/g;
const FUNCTION_RE = /^\$([^\s]+)\s?(.*)/;
const HEADER_RE = /^([^.]+)\.(request|response)\.headers\.(.+)/;
const BODY_RE = /^([^.]+)\.(request|response)\.body\.?((\$|\/\/)?[^}]+)?/;

export class VarMap {
    
    variables: StringMap;
    entities: EntityMap;
    
    constructor(props?: Props) {
        this.variables = props?.variables ?? {};
        this.entities = props?.entities ?? {};
    }
    
    // public addVars(variables: StringMap) {
    //     this.variables = {...this.variables, ...variables};
    // }
    
    public addVar(name: string, value: string) {
        this.variables[name] = value;
    }
    
    public addEntity(entity: Entity) {
        if (!entity.name) return;
        this.entities[entity.name] = entity;
    }
    
    public replace(text: string): string {
        const locals = this.replaceMap(this.variables);
        return this._replace(text, locals);
    }
    
    public replaceMap(map: StringMap): StringMap {
        const copy: StringMap = {};
        
        for (let [name, value] of Object.entries(map)) {
            copy[name] = this._replace(value, this.variables);
        }
        
        return copy;
    }
    
    public replaceHeaders(headers: Headers): Headers {
        const copy = new Headers();
        
        for (let [name, value] of headers) {
            copy.append(name, this.replace(value));
        }
        
        const auth = copy.get("authorization");
        if (auth) {
            const m = /^basic\s+([^\s]+)\s+(.+)/i.exec(auth);
            
            if (m) {
                const [_, username, password] = m;
                const basic = basicAuth(username, password);
                copy.set("authorization", basic);
            }
        }
        
        return copy;
    }
    
    private _findHeader(content: string) {
        const m = HEADER_RE.exec(content);
        
        if (m) {
            let [_, root, type, name] = m;
            
            const entity = this.entities[root];
            if (entity) {
                const property = entity[type as "request" | "request"];
                return property.headers.get(name);
            }
        }
        
        return "";
    }
    
    private _findFunction(content: string) {
        const m = FUNCTION_RE.exec(content);
        
        if (m) {
            const [_, name, args] = m;
            
            // @todo $shared.
            
            if (isFunction(name)) {
                const fn = FUNCTIONS[name];
                return fn.apply(null, args.split(/\s+/));
            }
        }
        
        return "";
    }
    
    private _findBody(content: string) {
        const m = BODY_RE.exec(content);
        
        if (m) {
            const [_, root, type, path, mode] = m;
            
            // entity lookup.
            if (this.entities[root]) {
                const entity = this.entities[root][type as "request" | "response"];
                
                const body = bodyAsString(entity.body);
                
                // empty
                if (!body) return "";
                
                // jsonpath
                if (mode == "$") {
                    const json = safeParseJson(body);
                    if (!json) return body + "";
                    
                    return JSONPath({ path, json });
                }
                
                // xpath
                if (mode == "//") {
                    const xml = new DOMParser().parseFromString(body);
                    const target = xpath.select(path, xml, true);
                    
                    return target
                        // @ts-ignore
                        ? target.value ?? target.toString()
                        : "";
                }
                
                // else
                return body + "";
            }
        }
        
        return "";
    }
    
    private _replace(text: string, locals: StringMap): string {
        
        return text.replace(RE, (_: string, content: string) => {
            
            const header = this._findHeader(content);
            if (header) return header;
            
            const fn = this._findFunction(content);
            if (fn) return fn;
            
            const body = this._findBody(content);
            if (body) return body;
            
            // variables
            return locals[content] || `{{${content}}}`;
        });
    }
}
