
import fs from './fs';
import path from 'path';
import { StringMap } from './utils';

type Environments = Record<string, StringMap>;

type FormParamEncoding = "always" | "never" | "automatic";

// Key names.
const CERTIFICATES = "rest-client.certificates";
const DECODE_ESCAPED_UNICODE = "rest-client.decodeEscapedUnicodeCharacters";
const DEFAULT_HEADERS = "rest-client.defaultHeaders";
const ENVIRONMENTS = "rest-client.environmentVariables";
const FOLLOW_REDIRECTS = "rest-client.followredirect";
const FORM_PARAM_ENCODING = "rest-client.formParamEncodingStrategy";
const PROXY_EXCLUDE_HOSTS = "rest-client.excludeHostsForProxy";
const REMEMBER_COOKIES = "rest-client.rememberCookiesForSubsequentRequests";
const TIMEOUT = "rest-client.timeoutinmilliseconds";

// Convert restclient variables to our own.
const PROPERTY_MAP: Record<string, keyof Settings> = {
    [CERTIFICATES]: 'certificates',
    [DECODE_ESCAPED_UNICODE]: 'decode_escaped_unicode',
    [DEFAULT_HEADERS]: 'default_headers',
    [ENVIRONMENTS]: 'environments',
    [FOLLOW_REDIRECTS]: 'follow_redirects',
    [FORM_PARAM_ENCODING]: 'form_param_encoding',
    [PROXY_EXCLUDE_HOSTS]: 'proxy_exclude_hosts',
    [REMEMBER_COOKIES]: 'remember_cookies',
    [TIMEOUT]: 'timeout',
} as const;


/**
 * Stuff.
 */
export class Settings {
    
    readonly certificates: StringMap = {};
    
    readonly decode_escaped_unicode = false;
    
    readonly default_headers: StringMap = {
        "User-Agent": "vscode-restclient (restcli)",
    };
    
    readonly environments: Environments = {
        "$shared": {},
    };
    
    readonly follow_redirects = true;
    
    readonly form_param_encoding: FormParamEncoding = "automatic";
    
    readonly proxy_exclude_hosts: string[] = [];
    
    readonly remember_cookies = true;
    
    readonly timeout = 0;
    
    
    public getEnvironment(name: string): StringMap {
        return {
            ...this.environments['$shared'],
            ...this.environments[name],
        }
    }
    
    
    public async loadFile(pathname: string) {
        const json = JSON.parse(await fs.readFile(pathname, 'utf-8'));
            
        for (let [key, value] of Object.entries(PROPERTY_MAP)) {
            if (!json[key]) continue;
            if (!this[value]) continue;
            
            // @ts-expect-error
            this[value] = json[key];
        }
    }
    
    
    public async loadVsCode(dirname: string) {
        try {
            const pathname = await Settings.findFile(dirname, 'settings.json', '.vscode');
            await this.loadFile(pathname);
        }
        catch (error) {}
    }
    
    
    public async loadPackage(dirname: string) {
        try {
            const pathname = await Settings.findFile(dirname, 'package.json');
            await this.loadFile(pathname);
        }
        catch (error) {}
    }
    
    
    /**
     * Find a file, like .vscode/settings.json or package.json.
     * 
     * @param dirname Start searching from here and work backwards.
     */
    public static async findFile(dirname: string, target_file: string, target_folder?: string): Promise<string> {
        try {
            for (let file of await fs.readdir(dirname)) {
                // File in folder.
                if (target_folder) {
                    if (file !== target_folder) continue;
                    
                    file = path.resolve(dirname, file, target_file);
                    const yes = await fs.exists(file);
                    
                    if (!yes) continue;
                }
                // Just file.
                else {
                    if (file !== target_file) continue;
                }
                
                return file;
                
            }
        }
        catch (error) {
            throw new Error(`Cannot find ${target_file}`);
        }
        
        // Stopper.
        if (dirname === "/") {
            throw new Error(`Cannot find ${target_file}`);
        }
        
        // Recurse backwards.
        return await Settings.findFile(path.resolve(dirname, ".."), target_file, target_folder);
    }
}
