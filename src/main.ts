
import path from 'path';
import { RestParser } from './RestParser';
import { getArgs, retry, bodyAsString, isServerError, headersAsString } from './utils';
import { EntityResponse } from './Entity';
import { RestRequest } from './RestRequest';

if (require.main === module) {
    require('source-map-support').install();
    process.on('unhandledRejection', console.error);
    main();
}

export async function main(argv = process.argv) {
    const { args, options } = getArgs([
        "full",
        "no-stats",
        "help",
    ], argv);
    
    if (options.help) {
        help();
        return;
    }
    
    const retryMax = +options.retry || 3;
    const requestName = options.pick;
    const showStats = !options["no-stats"];
    
    const showRequest = showOptions(!!options.full, options.request);
    const showResponse = showOptions(!!options.full, options.response);
    
    const parser = new RestParser();
    
    for (let filepath of args) {
        if (!filepath) continue;
        filepath = path.resolve(filepath);
        
        await parser.readFile(filepath);
    }
    
    if (parser.isEmpty()) {
        console.log("No files.");
        console.log("");
        help();
        return;
    }
    
    try {
        if (requestName) {
            const req = await parser.get(requestName);
            
            if (!req) {
                console.log(`Cannot find request: ${requestName}`);
                return;
            }
            
            await retry(retryMax, async attempt => {
                if (showStats) {
                    process.stdout.write(`${requestName}: [${attempt}] `);
                }
                printRequest(req, showRequest);
                
                let entity = await req.request();
                
                printResponse(entity.response, showResponse);
            });
        }
        else {
            let index = 0;
            for await (let req of parser.getAll()) {
                index++;
                
                await retry(retryMax, async attempt => {
                    if (showStats) {
                        process.stdout.write(`${req.getFileName()}:${index} [${attempt}] `);
                    }
                    printRequest(req, showRequest);
                    
                    let entity = await req.request();
                    
                    if (req.name) {
                        parser.vars.addEntity(req.name, entity);
                    }
                    
                    printResponse(entity.response, showResponse);
                });
            }
        }
    }
    catch (error) {
        console.log(error.message);
        if (isServerError(error)) {
            console.log(await error.response.text());
        }
    }
}

function printRequest(req: RestRequest, options: Options) {
    console.log(req.getSlug());
    
    if (options.headers) {
        console.log(headersAsString(req.headers));
    }
    if (options.body) {
        console.log(req.getBody());
        console.log("");
    }
}

function printResponse(res: EntityResponse, options: Options) {
    if (options.slug) {
        console.log(`HTTP/1.1 ${res.status} ${res.statusText}`);
    }
    if (options.headers) {
        console.log(headersAsString(res.headers));
    }
    if (options.body) {
        console.log(bodyAsString(res.body));
        console.log("");
    }
}

type Options = {
    slug: boolean;
    headers: boolean;
    body: boolean;
}

function showOptions(full: boolean, option: string): Options {
    return {
        slug: full || option == "slug" || option == "headers" || option == "body",
        headers: full || option == "headers" || option == "body",
        body: full || option == "body",
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
    console.log("  --no-stats");
    console.log("  --body <request|response|both>");
    console.log("  --headers <request|response|both>");
    console.log("  --full");
    console.log("  --help");
    console.log("");
}
