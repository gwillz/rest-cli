
import test from 'tape';
import { HeaderMap } from '../src';

test("HeaderMap: add/get", assert => {
    const map = new HeaderMap();
    
    map.add("bing-bang", "bong");
    
    assert.equals(map.size(), 1);
    assert.equals(map.get("bing-bang"), "bong");
    assert.equals(map.get("Bing-Bang"), "bong");
    assert.equals(map.get("BING-BANG"), "bong");
    
    assert.end();
});


test("HeaderMap: from", assert => {
    const map = HeaderMap.from({
        "one": "two",
        "three": "four",
    });
    
    assert.equals(map.size(), 2);
    assert.equals(map.get("one"), "two");
    assert.equals(map.get("three"), "four");
    
    assert.end();
});


test("HeaderMap: getAll", assert => {
    const map = HeaderMap.from({
        "one": "two",
        "three-four": "five",
        "six": "seven",
    });
    
    assert.equals(map.size(), 3);
    
    const iterator = map.getAll();
    
    assert.deepEquals(iterator.next().value, ["One", "two"]);
    assert.deepEquals(iterator.next().value, ["Three-Four", "five"]);
    assert.deepEquals(iterator.next().value, ["Six", "seven"]);
    
    assert.end();
});


test("HeaderMap: addAll", assert => {
    const other = HeaderMap.from({
        "abc": "123",
        "xyz": "789",
    })
    
    const map = new HeaderMap();
    
    assert.equals(map.size(), 0);
    
    map.addAll(other);
    
    assert.equals(map.size(), 2);
    assert.equals(map.get("abc"), "123");
    assert.equals(map.get("xyz"), "789");
    
    assert.end();
});
