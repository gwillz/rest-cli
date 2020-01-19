
import xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { JSONPath } from 'jsonpath-plus';
import { bodyAsString, safeParseJson, StringMap } from './utils';
import { EntityMap, Entity } from './Entity';

type Props = {
    variables?: StringMap,
    entities?: EntityMap;
}

const RE = /{{([^.}]+)(?:\.(request|response)\.(body|headers)\.((\$|\/\/)?[^}]+))?}}/g;

export class VarMap {
    
    variables: StringMap;
    entities: EntityMap;
    
    constructor(props?: Props) {
        this.variables = props?.variables ?? {};
        this.entities = props?.entities ?? {};
    }
    
    public addVars(variables: StringMap) {
        this.variables = {...this.variables, ...variables};
    }
    
    public addEntity(name: string, entity: Entity) {
        this.entities[name] = entity;
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
    
    private _replace(text: string, locals: StringMap): string {
        // @todo separate regex:
        // - variables
        // - headers
        // - body
        // - functions
        
        return text.replace(RE, (
                _match: string,
                root: string,
                type?: "request" | "response",
                property?: "body" | "headers",
                path?: string,
                mode?: "$" | "//") => {
            
            // console.log("match", _match);
            // console.log("root", root);
            // console.log("type", type);
            // console.log("property", property);
            // console.log("mode", mode);
            // console.log("path", path);
            
            // entity lookup.
            if (type && property && path && this.entities[root]) {
                let entity = this.entities[root][type];
                
                // headers
                if (property === "headers") {
                    return entity.headers.get(path) ?? "";
                }
                
                let body = bodyAsString(entity.body);
                
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
                    // @ts-ignore
                    return target.value ?? target.toString();
                }
                
                // else
                return body + "";
            }
        
            // variable lookup.
            else {
                return locals[root] || "";
            }
        });
    }
}
