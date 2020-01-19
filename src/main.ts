
import path from 'path';
import { RestParser } from './RestParser';
import { isAxiosError, getArgs } from './utils';

if (require.main === module) {
    require('source-map-support').install();
    process.on('unhandledRejection', console.error);
    main();
}

async function main() {
    const args = getArgs(["short"]);
    const parser = new RestParser();
    
    console.log(args);
    
    for (let filepath of args.args) {
        if (!filepath) continue;
        filepath = path.resolve(filepath);
        
        await parser.readFile(filepath);
    }
    
    if (parser.isEmpty()) {
        console.log("No files.");
        return;
    }
    
    try {
        let i = 0;
        for await (let req of parser.get()) {
            i++;
            
            await retry(3, async attempt => {
                console.log(`${i}: [${attempt}] ${req.toString()}`);
                
                let entity = await req.request();
                
                if (!args.options.short) {
                    console.log("");
                    console.log(entity.toString());
                }
                
                if (req.name) {
                    parser.vars.addEntity(req.name, entity);
                }
            })
        }
    }
    catch (error) {
        console.log(error.message);
        if (isAxiosError(error) && error.response) {
            console.log(error.response.data);
        }
    }
}


async function retry(attempts: number, cb: (attempt: number) => Promise<void>) {
    let attempt = 1;
    for (;;) {
        try {
            await cb(attempt);
            break;
        }
        catch (error) {
            if (attempt == attempts) {
                throw error;
            }
        }
        attempt++;
    }
}
