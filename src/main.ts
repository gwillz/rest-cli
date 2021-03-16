#!/usr/bin/env node

import chalk from 'chalk';
import { Headers } from 'node-fetch';
import { RestParser } from './RestParser';
import { RestRequest } from './RestRequest';
import { isServerError } from './ServerError';
import { getArgs, retry, capitalize, bodyFormat, expandPaths } from './utils';
import { EntityResponse } from './Entity';
import FUNCTIONS, { isFunction } from './functions';
import { highlight } from 'cli-highlight';
import { Settings } from './Settings';

const NONE = 0;
const RES_HEADERS = 1;
const RES_BODY = 2;
const RES_FULL = RES_HEADERS | RES_BODY;
const REQ_HEADERS = 4;
const REQ_BODY = 8;
const REQ_FULL = REQ_HEADERS | REQ_BODY;
const EXCHANGE = REQ_FULL | RES_FULL;

/**
 * Execute main if this is the calling module.
 * Also attaches TS source-map support and clean rejection handling.
 */
if (require.main === module) {
    require('source-map-support').install();
    process.on('unhandledRejection', console.error);
    main();
}

/**
 * Program entry.
 */
export async function main(argv = process.argv, cwd = process.cwd()) {
    const { args, options } = getArgs([
        "full",
        "no-stats",
        "no-color",
        "help",
    ], argv);

    // Help and quit.
    if (options.help) {
        help();
        return;
    }

    // Show version and quit.
    if (options.version || options.v) {
        await version();
        return;
    }

    // Test helper and quit.
    if (options.helper) {
        testHelper(options.helper, args);
        return;
    }

    // Runtime options.
    // @ts-expect-error
    const retryMax = +options.retry || +options.r || 3;
    const requestName = options.pick || options.p;
    const showStats = !options["no-stats"];
    const showColor = !options["no-color"];
    const showHighlight = !options["no-highlight"] && showColor;

    if (!showColor) {
        chalk.level = 0;
    }

    // Nuke it.
    if (options.quiet || options.q) {
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        process.stdout.write = () => true;
        process.stderr.write = () => true;
    }
    
    const isFull = options.full || options.f || options.pick || options.p;
    const preview = parsePreviewOption(options.show, isFull);
    
    // Load up settings.
    const settings = new Settings();
    let found = false;
    
    // Look for a .vscode/settings.json file.
    if (!found) {
        found = await settings.loadVsCode(cwd);
    }
    
    // Look for a package.json file.
    if (!found) {
        found = await settings.loadPackage(cwd);
    }
    
    // Is '--env' a file path?
    if (options.env && /\.json$/.test(options.env) ) {
        let found = await settings.loadEnv(options.env);
        if (found) {
            options.env = '';
        }
    }
    
    const parser = new RestParser({
        env: options.env,
        settings: settings,
    });
    
    // Load all the files into the parser.
    for await (let filePath of expandPaths(...args)) {
        await parser.readFile(filePath);
    }

    // Quit if it comes up empty.
    if (parser.isEmpty()) {
        console.log(chalk`{red No files.}`);
        console.log("");
        help();
        return;
    }

    try {
        // Perform a single named request.
        if (requestName) {
            const req = await parser.get(requestName);

            // Que?
            if (!req) {
                console.error(chalk`{red Cannot find request:} {white ${requestName}}`);
                return;
            }

            // Keep trying.
            await retry(retryMax, async attempt => {
                printStats(requestName, attempt, req);
                printRequest(req);
                
                // Hold up, maybe.
                const ok = await req.confirm();
                if (!ok) return;

                // Do it.
                let entity = await req.request();
                
                printResponse(entity.response);
            });
        }

        // Perform _all_ the requests.
        else {
            for (let file of parser) {
                let index = 0;

                for await (let req of file) {
                    index++;

                    // Keep trying.
                    await retry(retryMax, async attempt => {
                        printStats(`${file.getFileName()}:${index}`, attempt, req);
                        printRequest(req);
                        
                        // Hold up, maybe.
                        const ok = await req.confirm();
                        if (!ok) return;
                        
                        // Do it.
                        const entity = await req.request();

                        // console.log(req.name, entity.name);
                        if (entity.name) {
                            file.vars.addEntity(entity);
                        }

                        printResponse(entity.response);
                    });
                }

            }
        }
    }
    catch (error) {
        // Oh nooo.
        console.error(chalk.red(error.message));
        
        // Oh, okay.
        if (isServerError(error)) {
            console.log(chalk.red(await error.response.text()));
        }

        process.exitCode = 1;
    }
    
    
    function printStats(prefix: string, attempt: number, req: RestRequest) {
        if (!showStats) return;
        console.error(chalk`{grey ${prefix} [${attempt}]} {white ${req.getSlug()}}`);
    }
    
    
    /**
     * Print data about the request according to the cmd options.
     */
    function printRequest(req: RestRequest) {
        // Headers.
        if (preview & REQ_HEADERS) {
            console.log(req.getSlug());
            printHeaders(req.headers);
            console.log("");
        }
    
        // Body.
        if (preview & REQ_BODY) {
            const body = req.filePath ?? bodyFormat(req);
            if (body) {
                if (showHighlight) {
                    console.log(highlight(body, { ignoreIllegals: true }));
                }
                else {
                    console.log(body);
                }
                console.log("")
            }
        }
    }
    
    /**
     * Print data about the response according to the cmd options.
     */
    function printResponse(res: EntityResponse) {
        // Status.
        // Headers.
        if (preview & RES_HEADERS) {
            console.log(chalk.yellow(`HTTP/1.1 ${res.status} ${res.statusText}`));
            
            if (res.headers) {
                printHeaders(res.headers);
                console.log("");
            }
        }
    
        // Make it pretty! If possible. Mostly just JSON and XML.
        if (preview & RES_BODY) {
            const body = bodyFormat(res);
            
            if (body) {
                if (showHighlight) {
                    console.log(highlight(body, { ignoreIllegals: true }));
                }
                else {
                    console.log(body);
                }
                console.log("")
            }
        }
    }
}


/**
 * Print out the headers - now in colour!
 */
function printHeaders(headers: Headers) {
    for (let [name, value] of headers) {
        console.log(chalk`{green ${capitalize(name)}:} {greenBright ${value}}`);
    }
}

function parsePreviewOption(value: string | undefined, full: string | undefined): number {
    if (full) return EXCHANGE;
    if (!value) return NONE;
    
    switch (value) {
        default:
        case '':
        case 'none':
        case 'quiet':
            return NONE;
            
        case 'headers':
            return RES_HEADERS;
            
        case 'body':
            return RES_BODY;
            
        case 'full':
            return RES_FULL;
            
        case 'exchange':
            return EXCHANGE;
    }
}

/**
 * Test a helper function. Given it's name and any options.
 */
function testHelper(helper: string, args: string[]) {
    if (isFunction(helper)) {
        try {
            const fn = FUNCTIONS[helper];
            console.log(fn.apply(null, args));
        }
        // Functions throw ugly errors.
        // But for our gentle cmd users, make it pretty.
        catch (error) {
            // TODO Red text?
            console.log(error.message);
        }
    }
    else {
        // TODO Red text?
        console.log("rest-cli: Not a valid helper.");
        console.log("");
        for (let fn in FUNCTIONS) {
            console.log("-", fn);
        }
        process.exit(1);
    }
}

function help() {
    console.log("restcli: A HTTP/REST file sequencer.");
    console.log("");
    console.log("Usage:");
    console.log("  restcli {options} file1 file2 ...");
    console.log("  restcli --helper <name> {args...}");
    console.log("  restcli --help");
    console.log("  restcli --version");
    console.log("");
    console.log("Options:");
    console.log("  --retry [-r] <number> (default: 3)");
    console.log("  --pick  [-p] <name>");
    console.log("  --quiet [-q]");
    console.log("  --env <name>          An environment name (e.g. production)");
    console.log("  --env <path/to.json>  A file of variables");
    console.log("  --no-color");
    console.log("  --no-highlight");
    console.log("  --no-stats");
    console.log("");
    console.log("Display options:");
    console.log("  --full [-f]      (same as --show exchange)");
    console.log("  --show none      request URL only (default)");
    console.log("  --show headers   response headers");
    console.log("  --show body      response body");
    console.log("  --show exchange  request + response, headers + body");
    console.log("                   (default when --pick)");
    console.log("");
}

async function version() {
    let pkg: any;
    
    try {
        pkg = await import(__dirname + "/../../package.json");
    }
    catch (error) {
        pkg = await import(__dirname + "/../package.json");
    }
    
    console.log(`${pkg.name}: version ${pkg.version}`);
}
