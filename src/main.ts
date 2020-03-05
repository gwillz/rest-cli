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

    // Test helper and quit.
    if (options.helper) {
        testHelper(options.helper, args);
        return;
    }

    // Runtime options.
    const retryMax = +options.retry || 3;
    const requestName = options.pick;
    const showStats = !options["no-stats"];
    const showColor = !options["no-color"];

    if (!showColor) {
        chalk.level = 0;
    }

    const showRequest = showOptions(!!options.full, options.request);
    const showResponse = showOptions(!!options.full, options.response);

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
    console.log(chalk.white(req.getSlug()));

    if (options.headers) {
        printHeaders(req.headers);
        console.log("");
    }
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
    if (options.slug) {
        console.log(chalk.yellow(`HTTP/1.1 ${res.status} ${res.statusText}`));
    }
    if (options.headers && res.headers) {
        printHeaders(res.headers);
        console.log("");
    }
    if (options.body) {
        // Make it pretty! If possible. Mostly just JSON and XML.
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
        console.log(chalk`{green ${capitalise(name, '-')}:} {greenBright ${value}}`);
    }
}

type Options = {
    slug: boolean;
    headers: boolean;
    body: boolean;
}

/**
 * What data should we show for a request or response?
 * If 'full' then it's just everything.
 */
function showOptions(full: boolean, option: string): Options {
    return {
        slug: full || option == "slug" || option == "headers" || option == "body",
        headers: full || option == "headers" || option == "body",
        body: full || option == "body",
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
    console.log("");
    console.log("options:");
    console.log("  --retry <number> (default: 3)");
    console.log("  --pick <name>");
    console.log("  --body <request|response|both>");
    console.log("  --headers <request|response|both>");
    console.log("  --full");
    console.log("  --no-stats");
    console.log("  --no-color");
    console.log("  --helper <name> {args...}");
    console.log("  --help");
    console.log("");
}
