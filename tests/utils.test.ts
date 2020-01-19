
import test from 'tape';
import * as utils from '../src/utils';

test("utils: bodyAsString", assert => {
    {
        const actual = utils.bodyAsString("whatever");
        const expected = "whatever";
        assert.equals(actual, expected);
    }
    {
        const buffer = new Buffer("a whole bunch of stuff");
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
    
    assert.true(utils.isBuffer(new Buffer("")));
    
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
