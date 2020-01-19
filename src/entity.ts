
import { StringMap } from "./utils";

export interface Entity {
    request: {
        body: string | Buffer | null;
        headers: StringMap;
    }
    response: {
        body: any;
        headers: StringMap;
    }
}

export type EntityMap = Record<string, Entity>;
