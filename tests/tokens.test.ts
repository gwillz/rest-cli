
import test from 'tape';
import { findToken } from '../src';

test("Tokens: variable", assert => {
    
    const actual = findToken("@url = http://laa-dee-daa.com:8080/");
    const expected = {
        type: "variable",
        name: "url",
        value: "http://laa-dee-daa.com:8080/",
    };
    
    assert.deepEquals(actual, expected);
    assert.end();
});


test("Tokens: settings", assert => {
    
    {
        const actual = findToken("# @name henry");
        const expected = {
            type: "setting",
            name: "name",
            value: "henry",
        };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = findToken("// @note");
        const expected = {
            type: "setting",
            name: "note",
            value: undefined,
        };
        assert.deepEquals(actual, expected);
    }
    assert.end();
});


test("Tokens: comment", assert => {
    {
        const actual = findToken("# whatever");
        const expected = null;
        assert.equals(actual, expected);
    }
    {
        const actual = findToken("// whatever");
        const expected = null;
        assert.equals(actual, expected);
    }
    assert.end();
});


test("Tokens: request", assert => {
    
    {
        const actual = findToken("PUT {{url}}/users.json?heyy");
        const expected = {
            type: "request",
            method: "PUT",
            url: "{{url}}/users.json?heyy",
        };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = findToken("GET http://localhost/ HTTP/1.1");
        const expected = {
            type: "request",
            method: "GET",
            url: "http://localhost/",
        };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = findToken("http://localhost/whatever");
        const expected = {
            type: "request",
            method: "GET",
            url: "http://localhost/whatever",
        };
        assert.deepEquals(actual, expected);
    }
    
    assert.end();
});

test("Tokens: parameter", assert => {
    {
        const actual = findToken("   ?search=okayyy");
        const expected = {
            type: "request_param",
            value: "?search=okayyy",
        };
        
        assert.deepEquals(actual, expected);
    }
    {
        const actual = findToken("   &two=three  ");
        const expected = {
            type: "request_param",
            value: "&two=three",
        };
        
        assert.deepEquals(actual, expected);
    }
    assert.end();
});

test("Tokens: header", assert => {
    
    const actual = findToken("content-type: text/plain;charset=utf-8");
    const expected = {
        type: "header",
        name: "content-type",
        value: "text/plain;charset=utf-8",
    };
    
    assert.deepEquals(actual, expected);
    assert.end();
});

test("Tokens: file", assert => {
    
    const actual = findToken("< ./tokens.test.ts");
    const expected = {
        type: "file",
        path: "./tokens.test.ts",
    };
    
    assert.deepEquals(actual, expected);
    assert.end();
});
