
import test from 'tape';
import fs from 'fs';
import path from 'path';
import { RestParser } from '../src';

const r = path.resolve.bind(null, __dirname);
const TEST_FILE = r("test.http");


test("RestParser: read", assert => {
    const parser = new RestParser();
    assert.equals(parser.isEmpty(), true);

    parser.readString(TEST_FILE, fs.readFileSync(TEST_FILE, "utf-8"));
    assert.equals(parser.isEmpty(), false);

    assert.end();
});

test("RestParser: global variables", assert => {
    const globalVars = new Map<string,string>();
    globalVars.set('varName', 'varValue');

    const parser = new RestParser({ globalVars });
    assert.equals(parser.globalVars, globalVars, 'global vars are stored in rest parser');

    parser.readString(TEST_FILE, fs.readFileSync(TEST_FILE, "utf-8"));
    assert.equals(parser.files[0].vars.variables.varName, 'varValue', 'rest file contains global vars');

    assert.end();
});

// @todo Test out-of-order parsing

// @todo Test async iterator (using variable fills)

// @todo Test get(index)

// @todo Test get(name)
