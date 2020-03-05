
declare module 'xml-beautifier' {
    type beautifyFn = (input: string) => string;
    const beautify: beautifyFn;
    export = beautify;
}
