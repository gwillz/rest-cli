
import test from 'tape';
import path from 'path';
import { a } from './test';

import { Settings } from '../src/Settings';

const r = path.resolve.bind(null, __dirname);
const TEST_FILE = r("settings.json");

test("Settings: loadEnv", a(async assert => {
    
    // Mock an env variable.
    process.env.TEST = 'hey there';
    
    const settings = new Settings();
    
    // It's empty.
    assert.deepEquals(settings.environments, {
        '$shared': {}
    });
    
    await settings.loadEnv(TEST_FILE);
    
    assert.true(!!settings.environments['$shared']);
    assert.false(!!settings.environments['local']);
    assert.false(!!settings.environments['production']);
    
    let env: Record<string, string>;
    
    env = settings.getEnvironment('$shared');
    assert.equals(env.id, 'custom');
    assert.equals(env.host, 'http://localhost:3000');
    assert.equals(env.api, '/api/v0');
    assert.equals(env.password, '1234567890');
    assert.equals(env.test, 'hey there');
    
    env = settings.getEnvironment('whatever');
    assert.equals(env.id, 'custom');
    
    assert.end();
}));


test("Settings: loadVsCode", a(async assert => {
    const settings = new Settings();
    
    // It's empty.
    assert.deepEquals(settings.environments, {
        '$shared': {}
    });
    
    await settings.loadVsCode(process.cwd());
    
    assert.true(!!settings.environments['$shared']);
    assert.true(!!settings.environments['local']);
    assert.true(!!settings.environments['production']);
    
    let env: Record<string, string>;
    
    env = settings.getEnvironment('$shared');
    assert.equals(env.id, 'vscode'); 
    assert.equals(env.host, 'http://localhost:3000');
    assert.equals(env.api, '/api/v0');
    assert.equals(env.password, undefined);
    
    env = settings.getEnvironment('local');
    assert.equals(env.id, 'vscode');
    assert.equals(env.host, 'http://localhost:3000');
    assert.equals(env.api, '/api/v0');
    assert.equals(env.password, '1234567890');
    
    env = settings.getEnvironment('production');
    assert.equals(env.id, 'vscode'); 
    assert.equals(env.host, 'https://example.com');
    assert.equals(env.api, '/api/v0');
    assert.equals(env.password, 'REDACTED');
    
    assert.end();
}));


test("Settings: loadPackage", a(async assert => {
    const settings = new Settings();
    
    // It's empty.
    assert.deepEquals(settings.environments, {
        '$shared': {}
    });
    
    await settings.loadPackage(process.cwd());
    
    assert.true(!!settings.environments['$shared']);
    assert.true(!!settings.environments['local']);
    assert.true(!!settings.environments['production']);
    
    let env: Record<string, string>;
    
    env = settings.getEnvironment('$shared');
    assert.equals(env.id, 'package');
    assert.equals(env.password, undefined);
    
    env = settings.getEnvironment('local');
    assert.equals(env.id, 'package');
    assert.equals(env.password, '1234567890');
    
    env = settings.getEnvironment('production');
    assert.equals(env.id, 'package');
    assert.equals(env.password, 'REDACTED');
    
    assert.end();
}));
