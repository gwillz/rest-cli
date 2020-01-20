
import { StringMap, capitalise } from './utils';
import { VarMap } from './VarMap';

export function isHeaderMap(test: any): test is HeaderMap {
    return (
        !!test &&
        test.constructor?.name === "HeaderMap"
    );
}

export class HeaderMap {
    
    private map: StringMap = {};
    private count = 0;
    
    public static from(other: StringMap | HeaderMap) {
        const map = new HeaderMap();
        map.addAll(other);
        return map;
    }
    
    public size() {
        return this.count;
    }
    
    public fill(vars: VarMap): HeaderMap {
        const map = new HeaderMap();
        
        for (let [name, value] of Object.entries(this.map)) {
            map.add(name, vars.replace(value));
        }
        
        return map;
    }
    
    public add(name: string, value: string) {
        name = name.toLowerCase();
        if (!this.map[name]) {
            this.count++;
        }
        this.map[name] = value;
    }
    
    public get(name: string): string | undefined {
        return this.map[name.toLowerCase()];
    }
    
    public addAll(other: StringMap | HeaderMap): void;
    public addAll(other: any): void {
        
        const entities =
            isHeaderMap(other)
            ? other.getAll()
            : Object.entries(other) as [string, string][];
        
        for (let [name, value] of entities) {
            this.add(name.toLowerCase(), value);
        }
    }
    
    public *getAll(): Generator<[string, string]> {
        for (let [name, value] of Object.entries(this.map)) {
            yield [capitalise(name, '-'), value];
        }
    }
    
    public toString(): string {
        let out = "";
        
        for (let [name, value] of this.getAll()) {
            out += `${name}: ${value}\n`;
        }
        
        return out;
    }
}
