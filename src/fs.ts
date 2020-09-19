
import fs from 'fs';
import util from 'util';

const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);
const lstat = util.promisify(fs.lstat);
const readdir = util.promisify(fs.readdir);

export default {
    ...fs,
    readFile,
    exists,
    lstat,
    readdir,
}
