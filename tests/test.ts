
import { Test } from 'tape';

type TestCb = (test: Test) => Promise<void>;

export function a(cb: TestCb): TestCb {
    return async (test) => {
        try {
            await cb(test);
        }
        catch (error) {
            test.end(error);
        }
    }
}
