# Rest CLI

A request runner inspired by
[REST Client](https://github.com/Huachao/vscode-restclient).

This tool is intended to be compliant with Hauchao's VSCode plugin so that
requests can be sequenced via command line tools.


## Usage
```sh
npm install -g rest-cli

# A single file, simple output.
# Shows stats, request method, and URL.
rest-cli myrequest.http

# A sequence of files.
rest-cli requests/*.http

# Modify retry count (default: 3).
rest-cli --retry 5 myrequest.http

# A named request within a file.
rest-cli --pick myname myrequest.http

# Hide the stats (1: [2]).
rest-cli --no-stats myrequest.http

# Show the request.
rest-cli --request slug|headers|body myrequest.http

# Show the response.
rest-cli --response slug|headers|body myrequest.http

# Show everything.
rest-cli --full myrequest.http
```


## API

This package exports a file parser and utilities for automating your requests.

```js
import { RestParser } from 'rest-cli';

(async () => {
    const parser = new RestParser();
    await parser.readFile("./myrequest.http");
    
    const request = await parser.get(0);
    console.log(request.toString());
    
    const { response } = await request.request();
    console.log(response.body);
})();
```

Typescript defs are also exported.


## Node v8

This uses async iterators and therefore only supports Node v10.

If you really need Node v8, you can hack a solution with the
`--harmony_async_iterator` flag. Something like:

```js
#!/usr/bin/node --harmony_async_iterator
require('rest-cli').main();
```


## Not supported
- GraphQL
- aadToken


## TODO
- functions (aka. dynamic variables)
- shared variables
- pretty formatting XML/JSON in response bodies
