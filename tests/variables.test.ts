
import test from 'tape';
import { VarMap } from '../src';
import { Entity } from '../src/Entity';

// @todo Test functions (aka. dynamic variables)

// @todo Test shared variables

function mockEntity(): Entity {
    return {
        request: {
            headers: {
                'content-type': 'application/json',
            },
            body: '{"one":{"two":3}}',
        },
        response: {
            headers: {
                'content-type': 'text/xml',
            },
            body: '<one><two three="four"/></one>',
            statusText: "OK",
            status: 200,
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
