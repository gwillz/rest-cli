#!/usr/bin/node

import chalk from 'chalk';
import { Headers } from 'node-fetch';
import { RestParser } from './RestParser';
import { RestRequest } from './RestRequest';
import { isServerError } from './ServerError';
import { getArgs, retry, capitalise, bodyFormat, expandPaths } from './utils';
import { EntityResponse } from './Entity';
import FUNCTIONS, { isFunction } from './functions';

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
export async function main(argv = process.argv) {
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
        version();
        return;
    }

    // Test helper and quit.
    if (options.helper) {
        testHelper(options.helper, args);
        return;
    }

    // Runtime options.
    const retryMax = +options.retry || +options.r || 3;
    const requestName = options.pick || options.p;
    const showStats = !options["no-stats"];
    const showColor = !options["no-color"];

    if (!showColor) {
        chalk.level = 0;
    }

    // Nuke it.
    if (options.quiet || options.q) {
        console.log = () => {};
        process.stdout.write = () => true;
    }

    const showRequest = showOptions('req', options);
    const showResponse = showOptions('res', options);

    const parser = new RestParser();

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
                console.log(chalk`{red Cannot find request:} {white ${requestName}}`);
                return;
            }

            // Keep trying.
            await retry(retryMax, async attempt => {
                if (showStats) {
                    process.stdout.write(chalk.grey(`${requestName}: [${attempt}] `));
                }
                printRequest(req, showRequest);

                // Do it.
                let { response } = await req.request();

                printResponse(response, showResponse);
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
                        if (showStats) {
                            process.stdout.write(chalk.grey(`${file.getFileName()}:${index} [${attempt}] `));
                        }
                        printRequest(req, showRequest);

                        // Do it.
                        const entity = await req.request();

                        // console.log(req.name, entity.name);
                        if (entity.name) {
                            file.vars.addEntity(entity);
                        }

                        printResponse(entity.response, showResponse);
                    });
                }

            }
        }
    }
    catch (error) {
        // Oh nooo.
        console.log(chalk.red(error.message));

        // Oh, okay.
        if (isServerError(error)) {
            console.log(chalk.red(await error.response.text()));
        }
    }
}

/**
 * Print data about the request according to the cmd options.
 */
function printRequest(req: RestRequest, options: Options) {
    // Slug.
    console.log(chalk.white(req.getSlug()));

    // Headers.
    if (options.headers) {
        printHeaders(req.headers);
        console.log("");
    }

    // Body.
    if (options.body) {
        const body = req.filePath ?? bodyFormat(req);
        if (body) {
            console.log(body);
            console.log("")
        }
    }
}

/**
 * Print data about the response according to the cmd options.
 */
function printResponse(res: EntityResponse, options: Options) {
    // Slug.
    console.log(chalk.yellow(`HTTP/1.1 ${res.status} ${res.statusText}`));

    // Headers.
    if (options.headers && res.headers) {
        printHeaders(res.headers);
        console.log("");
    }

    // Make it pretty! If possible. Mostly just JSON and XML.
    if (options.body) {
        const body = bodyFormat(res);
        if (body) {
            console.log(body);
            console.log("")
        }
    }
}

/**
 * Print out the headers - now in colour!
 */
function printHeaders(headers: Headers) {
    for (let [name, value] of headers) {
        console.log(chalk`{green ${capitalise(name)}:} {greenBright ${value}}`);
    }
}

type Options = {
    // slug: boolean;
    headers: boolean;
    body: boolean;
}

/**
 * What data should we show for a request or response?
 * If 'full' then it's just everything.
 */
function showOptions(prefix: 'res' | 'req', options: Record<string, string>): Options {
    const isFull = !!options.full || !!options.f;

    if (options.pick && prefix === 'res') {
        return { headers: true, body: true };
    }

    return {
        headers: isFull || !!options[prefix] || !!options[`${prefix}-head`],
        body: isFull || !!options[prefix] || !!options[`${prefix}-body`],
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
    console.log("rest-cli: A HTTP/REST file sequencer.");
    console.log("");
    console.log("Usage:");
    console.log("  rest-cli {options} file1 file2 ...");
    console.log("  rest-cli --helper <name> {args...}");
    console.log("  rest-cli --help");
    console.log("  rest-cli --version");
    console.log("");
    console.log("Options:");
    console.log("  --retry [-r] <number> (default: 3)");
    console.log("  --pick  [-p] <name>");
    console.log("  --quiet [-q]");
    console.log("  --no-color");
    console.log("  --no-stats");
    console.log("");
    console.log("Display options:");
    console.log("  --full [-f]");
    console.log("  --req");
    console.log("  --req-head");
    console.log("  --req-body");
    console.log("  --res");
    console.log("  --res-head");
    console.log("  --res-body");
    console.log("");
}

function version() {
    const pkg = (() => {
        try {
            return require(__dirname + "/../../package.json");
        }
        catch (e) {
            return require(__dirname + "/../package.json");
        }
    })();
    console.log(`${pkg.name}: version ${pkg.version}`);
}
