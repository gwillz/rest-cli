
import { Test, TestCase } from 'tape';

type AsyncTestCase = (test: AsyncTest) => Promise<void>;

interface AsyncTest extends Test {
    aThrows: (this: AsyncTest, fn: () => Promise<void>) => Promise<void>;
    aDoesNotThrow: (this: AsyncTest, fn: () => Promise<void>) => Promise<void>;
}


export function a(cb: AsyncTestCase): TestCase {
    return async (test) => {
        // @ts-expect-error
        test.aThrows = asyncThrows.bind(test);
        // @ts-expect-error
        test.aDoesNotThrow = asyncDoesNotThrow.bind(test);
        
        try {
            await cb(test as AsyncTest);
        }
        catch (error) {
            test.end(error);
        }
    }
}


async function asyncThrows(this: Test, cb: () => Promise<void>, msg?: string): Promise<void> {
    try {
        await cb();
        this.fail(msg || 'Should throw');
    }
    catch (error) {}
}


async function asyncDoesNotThrow(this: AsyncTest, cb: () => Promise<void>, msg?: string): Promise<void> {
    try {
        await cb();
    }
    catch (error) {
        console.error(error);
        this.fail(msg || 'Should not throw');
    }
}


export async function toArray<T>(generator: AsyncGenerator<T>): Promise<T[]> {
    const list: T[] = [];
    for await (let item of generator) {
        list.push(item);
    }
    return list;
}
