
import test from 'tape';
import * as utils from '../src/utils';

test("utils: bodyAsString", assert => {
    {
        const actual = utils.bodyAsString("whatever");
        const expected = "whatever";
        assert.equals(actual, expected);
    }
    {
        const buffer = Buffer.from("a whole bunch of stuff");
        const actual = utils.bodyAsString(buffer);
        const expected = "a whole bunch of stuff";
        assert.equals(actual, expected);
    }
    assert.end();
});

test("utils: isBuffer", assert => {
    assert.false(utils.isBuffer(1));
    assert.false(utils.isBuffer("stuff"));
    assert.false(utils.isBuffer({}));
    assert.false(utils.isBuffer({constructor: "neat"}));
    
    assert.true(utils.isBuffer(Buffer.from("")));
    
    assert.end();
});

test("utils: safeParseJson", assert => {
    {
        const actual = utils.safeParseJson('{"one": 2, "um": [{"3": "four"}]}');
        const expected = {one: 2, um: [{"3": "four"}]};
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.safeParseJson('this is {} invalid.');
        const expected = null;
        assert.equals(actual, expected);
    }
    assert.end();
});

test("utils: getArgs", assert => {
    
    const args = utils.getArgs(['six'], [
        "/usr/bin/node",
        "/home/utils.js",
        "--one",
        "--two",
        "three",
        "four",
        "five",
        "--six",
        "seven",
        "eight",
        "--nine",
    ]);
    
    assert.equals(args.node, "/usr/bin/node");
    assert.equals(args.script, "/home/utils.js");
    
    assert.deepEquals(args.options, {
       "one": "true",
       "two": "three",
       "six": "true",
       "nine": "true",
    });
    
    assert.deepEquals(args.args, [
        "four", "five", "seven", "eight"
    ]);
    
    assert.end();
});

test("utils: retry (immediate)", async assert => {
    assert.plan(1);
    let count = 0;
    
    try {
        await utils.retry(5, attempt => {
            count = attempt;
        });
    }
    catch (error) {
        assert.fail(error);
    }
    
    assert.equals(count, 1);
    assert.end();
});

test("utils: retry (good)", async assert => {
    assert.plan(1);
    let count = 0;
    
    try {
        await utils.retry(5, attempt => {
            count = attempt;
            if (attempt < 3) throw new Error("mm");
        });
    }
    catch (error) {
        assert.fail(error);
    }
    
    assert.equals(count, 3);
    assert.end();
});

test("utils: retry (bad)", async assert => {
    assert.plan(1);
    let count = 0;
    
    try {
        await utils.retry(5, attempt => {
            count = attempt;
            throw new Error("mm");
        });
        
        assert.fail();
    }
    catch (error) {}
    
    assert.equals(count, 5);
    assert.end();
});
