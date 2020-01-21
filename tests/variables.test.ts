
import test from 'tape';
import { VarMap } from '../src';
import { Entity } from '../src/Entity';
import { Headers } from 'node-fetch';

// @todo Test shared variables

function mockEntity(): Entity {
    return {
        request: {
            headers: new Headers({
                'content-type': 'application/json',
            }),
            body: '{"one":{"two":3}}',
            getBody() { return this.body + "" },
        },
        response: {
            headers: new Headers({
                'content-type': 'text/xml',
            }),
            body: Buffer.from('<one><two three="four"/></one>'),
            statusText: "OK",
            status: 200,
            getBody() { return this.body.toString("utf-8") },
        }
    }
}

test("VarMap: variable", assert => {
    const vars = new VarMap({ variables: {
        one: 'two',
        three: 'four',
    }});
    
    const actual = vars.replace("{{one}}-two-{{three}}");
    const expected = "two-two-four";
    assert.equals(actual, expected);
    
    assert.end();
});

test("VarMap: request header", assert => {
    const vars = new VarMap({ entities: {
        test: mockEntity(),
    }});
    
    const actual = vars.replace("{{test.request.headers.content-type}}");
    const expected = "application/json";
    
    assert.equals(actual, expected);
    assert.end();
});

test("VarMap: request json body", assert => {
    const vars = new VarMap({ entities: {
        test: mockEntity(),
    }});
    
    const actual = vars.replace("{{test.request.body.$..two}}");
    const expected = "3";
    
    assert.equals(actual, expected);
    assert.end();
});

test("VarMap: response header", assert => {
    const vars = new VarMap({ entities: {
        test: mockEntity(),
    }});
    
    const actual = vars.replace("{{test.response.headers.content-type}}");
    const expected = "text/xml";
    
    assert.equals(actual, expected);
    assert.end();
});

test("VarMap: response xml body", assert => {
    const vars = new VarMap({ entities: {
        test: mockEntity(),
    }});
    
    const actual = vars.replace("{{test.response.body.//@three}}");
    const expected = "four";
    
    assert.equals(actual, expected);
    assert.end();
});

test("VarMap: $guid", assert => {
    const vars = new VarMap();
    
    const actual = vars.replace("{{$guid}}");
    
    assert.equals(actual.length, 36, "bad: " + actual);
    assert.end();
});

test("VarMap: $randomInt", assert => {
    const save = Math.random;
    Math.random = () => 0.5;
    
    const vars = new VarMap();
    
    const actual = vars.replace("{{$randomInt 50 150}}");
    const expected = "100";
    
    assert.equals(actual, expected);
    assert.end();
    
    Math.random = save;
});

test("VarMap: $timestamp -60 seconds", assert => {
    const vars = new VarMap();
    
    const actual = vars.replace("{{$timestamp -60 s}}");
    const expected = (+new Date()) + "";
    
    assert.true(actual < expected, `${actual} < ${expected}`);
    assert.end();
});

test("VarMap: $datetime rfc1123 -10 years", assert => {
    const vars = new VarMap();
    
    const actual = vars.replace("{{$datetime rfc1123 -10 y}}");
    const expected = (new Date().getUTCFullYear() - 10) + "";
    
    assert.true(actual.includes(expected), actual);
    assert.end();
});

test("VarMap: $datetime iso8601", assert => {
    const vars = new VarMap();
    
    const actual = vars.replace("{{$datetime iso8601}}");
    const expected = new Date().toISOString();
    
    assert.true(actual, expected);
    assert.end();
});

test("VarMap: $localDatetime custom", assert => {
    const vars = new VarMap();
    
    const actual = vars.replace("{{$localDatetime \"D\"}}");
    const expected = new Date().getDate() + "";
    
    assert.equals(actual, expected);
    assert.end();
});
