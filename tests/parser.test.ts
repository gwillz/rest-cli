
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
