
import test from 'tape';
import path from 'path';
import * as utils from '../src/utils';
import { DateTime } from 'luxon';
import { a, toArray } from './test';

const r = path.resolve.bind(null, __dirname);

// @todo test bodyFormat.
// @todo test jsonFormat.
// @todo test xmlFormat.
// @todo test basicAuth.

// @todo formatJson instead of jsonFormat?
// Or dateFormat instead of formatDate?

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

test("utils: retry (immediate)", a(async assert => {
    assert.plan(1);
    let count = 0;

    await assert.aDoesNotThrow(async () => {
        await utils.retry(5, attempt => {
            count = attempt;
        });
    });

    assert.equals(count, 1);
    assert.end();
}));

test("utils: retry (good)", a(async assert => {
    let count = 0;

    await assert.aDoesNotThrow(async () => {
        await utils.retry(5, attempt => {
            count = attempt;
            if (attempt < 3) throw new Error("mm");
        });
    });

    assert.equals(count, 3);
    assert.end();
}));

test("utils: retry (bad)", a(async assert => {
    let count = 0;
    
    await assert.aThrows(async () => {
        await utils.retry(5, attempt => {
            count = attempt;
            throw new Error("mm");
        });
    });

    assert.equals(count, 5);
    assert.end();
}));

test("utils: capitalise", assert => {

    const actual = utils.capitalize("this-is-LOWER.");
    const expected = "This-Is-Lower.";

    assert.equals(actual, expected);
    assert.end();
});

test("utils: getDuration", assert => {
    {
        const actual = utils.getDuration(100, "ms");
        const expected = { "milliseconds": 100 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(-10, "s");
        const expected = { "seconds": -10 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(1, "m");
        const expected = { "minutes": 1 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(-1, "h");
        const expected = { "hours": -1 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(7, "d");
        const expected = { "days": 7 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(4, "w");
        const expected = { "weeks": 4 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(12, "M");
        const expected = { "months": 12 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(4, "Q");
        const expected = { "quarters": 4 };
        assert.deepEquals(actual, expected);
    }
    {
        const actual = utils.getDuration(0, "y");
        const expected = { "years": 0 };
        assert.deepEquals(actual, expected);
    }

    assert.end();
});

test("utils: getOffset", assert => {
    const date = DateTime.local();

    {
        const actual = utils.getOffset(date);
        assert.equals(+actual, +date);
    }
    {
        const actual = utils.getOffset(date, "10", "w");
        const expected = date.plus({ weeks: 10 });
        assert.equals(+actual, +expected);
    }
    {
        const actual = utils.getOffset(date, "-2", "y");
        const expected = date.plus({ years: -2 });
        assert.equals(+actual, +expected);
    }

    assert.end();
});

test("utils: formatDate", assert => {
    const date = DateTime.utc(2000, 3, 4, 5, 6, 7, 8);

    {
        const actual = utils.formatDate(date, "rfc1123");
        const expected = "Sat, 04 Mar 2000 05:06:07 GMT";
        assert.equals(actual, expected);
    }
    {
        const actual = utils.formatDate(date, "iso8601");
        const expected = "2000-03-04T05:06:07.008Z";
        assert.equals(actual, expected);
    }
    {
        const actual = utils.formatDate(date, "\"YYYY-MM-D\"");
        const expected = "2000-03-4";
        assert.equals(actual, expected);
    }
    {
        const actual = utils.formatDate(date, "y");
        const expected = "y";
        assert.equals(actual, expected);
    }

    assert.end();
});

test("utils: expandPaths directory", a(async assert => {
    const actual = await toArray(utils.expandPaths("tests/"));
    const expected = [
        r("test-2.http"),
        r("test-3.rest"),
        r("test.http"),
    ];

    actual.sort();
    assert.deepEquals(actual, expected);
    assert.end();
}));

test("utils: expandPaths glob", a(async assert => {
    const actual = await toArray(utils.expandPaths("tests/*.http"));
    const expected = [
        r("test-2.http"),
        r("test.http"),
    ];

    actual.sort();
    assert.deepEquals(actual, expected);
    assert.end();
}));
