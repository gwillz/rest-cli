
import test from 'tape';

import * as FUNCTIONS from '../src/functions';

test("functions: guid", assert => {
    const one = FUNCTIONS.guid();
    const two = FUNCTIONS.guid();
    
    assert.equals(one.length, 36);
    assert.equals(two.length, 36);
    assert.notEquals(one, two);
    
    assert.end();
});

test("functions: randomInt", assert => {
    const save = Math.random;
    
    Math.random = () => 0;
    const lower = FUNCTIONS.randomInt("100", "200");
    assert.equals(lower, "100");
    
    Math.random = () => 0.50789;
    const half = FUNCTIONS.randomInt("100", "200");
    assert.equals(half, "150");
    
    Math.random = () => 1;
    const upper = FUNCTIONS.randomInt("100", "200");
    assert.equals(upper, "200");
    
    assert.end();
    Math.random = save;
});

test("functions: timestamp", assert => {
    const save = Date.now;
    const fixedNow = Date.now();
    Date.now = () => fixedNow;
    
    const actual = FUNCTIONS.timestamp();
    const expected = Date.now() + "";
    
    assert.equals(actual, expected);
    assert.end();
    
    Date.now = save;
});

test("functions: timestamp offset", assert => {
    const save = Date.now;
    const fixedNow = Date.now();
    Date.now = () => fixedNow;
    
    const actual = FUNCTIONS.timestamp("1", "h");
    const expected = (Date.now() + 60 * 60 * 1000) + "";
    
    assert.equals(actual, expected);
    assert.end();
    
    Date.now = save;
});


// @todo datetime

// @todo localDatetime

// @todo processEnv

// @todo dotenv
