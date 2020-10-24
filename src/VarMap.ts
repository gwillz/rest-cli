
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

/** Match double brackets. */
const RE = /{{([^}]+)}}/g;

/** Match $function and args. */
const FUNCTION_RE = /^\$([^\s]+)\s?(.*)/;

/** Match named request/response headers. */
const HEADER_RE = /^([^.]+)\.(request|response)\.headers\.(.+)/;

/** Match named request/response body paths, supports jsonpath + xpath. */
const BODY_RE = /^([^.]+)\.(request|response)\.body\.?((\$|\/\/)?[^}]+)?/;


/**
 * This holds local variables and entities.
 * Primarily though, it does all the fancy template interpolation stuff.
 */
export class VarMap {
    
    /**
     * Variables are user defined `@thing = whatever`.
     */
    variables: StringMap;
    
    /**
     * Entities are request/response objects from `# @name` declarations.
     */
    entities: EntityMap;
    
    constructor(props?: Props) {
        this.variables = props?.variables ?? {};
        this.entities = props?.entities ?? {};
    }
    
    /**
     * Add a bunch of local variables.
     * 
     * @param variables 
     */
    public addVars(variables: StringMap) {
        for (let [name, value] of Object.entries(variables)) {
            this.addVar(name, value);
        }
    }
    
    /**
     * Add a single variable.
     * 
     * @param name 
     * @param value 
     */
    public addVar(name: string, value: string) {
        this.variables[name] = value;
    }
    
    /**
     * Add a named request/response entity.
     * 
     * Although if you pass an unnamed entity, we'll just ignore it.
     * 
     * @param entity 
     */
    public addEntity(entity: Entity) {
        if (!entity.name) return;
        this.entities[entity.name] = entity;
    }
    
    /**
     * Interpolate variables into this body.
     * 
     * @param text A body payload.
     * @return A copy of the body with inserted variables.
     */
    public replace(text: string): string {
        // Interpolate our own variables before 
        const locals = this.replaceMap(this.variables);
        return this._replace(text, locals);
    }
    
    /**
     * Interpolate variables into a variable map.
     * 
     * @param map A variable map.
     * @return A copy of the map with inserted variables.
     */
    public replaceMap(map: StringMap): StringMap {
        const copy: StringMap = {};
        
        for (let [name, value] of Object.entries(map)) {
            copy[name] = this._replace(value, this.variables);
        }
        
        return copy;
    }
    
    /**
     * Interpolate variables into a headers map.
     * 
     * @param headers A set of headers.
     * @return A copy of the headers with inserted variables.
     */
    public replaceHeaders(headers: Headers): Headers {
        const copy = new Headers();
        
        for (let [name, value] of headers) {
            copy.append(name, this.replace(value));
        }
        
        // The 'authorization' header is a special case.
        // We do automatic basic auth encoding if the user passes a
        // "basic <user> <pass>" pattern.
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
    
    /**
     * Find and replace request/response header interpolations.
     * 
     * E.g.
     * - 'name.response.header.content-type' => 'application/x-www-urlencoded'
     * - 'name.request.header.accepts' => 'application/json'
     * 
     * @param content Template bracket contents.
     * @return The matching header value, null if no match or invalid signature.
     */
    private _findHeader(content: string) {
        const m = HEADER_RE.exec(content);
        
        if (m) {
            let [_, root, type, name] = m;
            
            const entity = this.entities[root];
            if (entity) {
                const property = entity[type as "request" | "response"];
                return property.headers.get(name);
            }
        }
        
        return null;
    }
    
    /**
     * Find and replace function interpolations.
     * 
     * E.g.
     * - '$datetime iso8601 d 3' => '2020-01-04T23:59:59.999Z'
     * 
     * @param content Template bracket contents.
     * @return The function result.
     */
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
        
        return null;
    }
    
    /**
     * Find and replace request/response body interpolations.
     * 
     * E.g.
     * - 'name.request.body.$..thing_id' => '123'
     * - 'name.response.body.$.created_date' => '2020-12-30'
     * - 'name.request.body.//path/to/etc' => 'hello there'
     * 
     * @param content Template bracket contents.
     * @return The path result.
     */
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
                    
                    const value = JSONPath({ path, json, wrap: false });
                    
                    // Can't have [object Object], gotta be JSON strings.
                    if (typeof value === 'object') {
                        return JSON.stringify(value);
                    }
                    else {
                        return value;
                    }
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
    
    /**
     * Internal interpolator.
     * 
     * Throw any thing that is wrapped in {{}} double brackets at this.
     * It'll figure out whether it's a header, body, function or variable.
     * 
     * @param text The template.
     * @param locals The variable map for interpolation.
     */
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
