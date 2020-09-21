# Rest CLI

A request runner inspired by
[REST Client](https://github.com/Huachao/vscode-restclient).

This tool is intended to be compliant with Hauchao's VSCode plugin so that
requests can be sequenced via command line tools.

There is no intention to extend features in this project beyond what is already
capable in the plugin. Ideally, one can execute the very same files with the
same environment interchangeably between the plugin and this tool.

If you need extra features, feel free to fork this project.


## Usage
```sh
npm install -g rest-cli

# A single file, simple output.
# Shows stats, request method, and URL.
restcli myrequest.http

# A sequence of files.
restcli requests/*.http

# All .http files in the current directory.
restcli .

# Modify retry count (default: 3).
restcli --retry 5 myrequest.http

# A named request within a file.
restcli --pick myname myrequest.http

# Hide the stats (1: [2]).
restcli --no-stats myrequest.http

# Show different level of information.
restcli --show headers myrequest.http
restcli --show body myrequest.http
restcli --show full myrequest.http
restcli --show exchange myrequest.http

# Use production env variables.
restcli --env production myrequest.http

# Load in a json file of variables.
restcli --env env.json myrequest.http

# Disable colour.
restcli --no-color myrequest.http
```


## API

This package exports a file parser and utilities for automating your requests.

See the `main.ts` file for extended usage.

Typescript defs are also exported.

### Example

```js
import { RestParser } from 'rest-cli';

(async () => {
    const parser = new RestParser();
    await parser.readFile("./myrequest.http");
    
    const request = await parser.get(0);
    console.log(request.toString());
    
    const { response } = await request.request();
    console.log(response.getBody());
})();
```


## Node v8

This uses async iterators and therefore only supports Node v10.
Note, as of January 2020, Node v8 is end-of-life and unsupported.
If you really need Node v8, you can hack a solution with the
`--harmony_async_iterator` flag.

Something like:

```sh
echo "#!/usr/bin/node --harmony_async_iterator" > restcli
echo "require('rest-cli').main()" >> restcli
chmod +x restcli
./restcli
```


## HTTP Language

This follows the standard RFC 2616, with templating as defined by
[vscode-restclient](https://github.com/Huachao/vscode-restclient#http-language).

### Example file

```http
@baseUrl = https://example.com/api

# @name login
POST {{baseUrl}}/api/login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

name=foo&password=bar

###

@authToken = {{login.response.headers.X-AuthToken}}

# @name createComment
POST {{baseUrl}}/comments HTTP/1.1
Authorization: {{authToken}}
Content-Type: application/json

{
    "content": "fake content"
}

###

@commentId = {{createComment.response.body.$.id}}

# @name getCreatedComment
GET {{baseUrl}}/comments/{{commentId}} HTTP/1.1
Authorization: {{authToken}}

###

# @name getReplies
GET {{baseUrl}}/comments/{{commentId}}/replies HTTP/1.1
Accept: application/xml

###

# @name getFirstReply
GET {{baseUrl}}/comments/{{commentId}}/replies/{{getReplies.response.body.//reply[1]/@id}}
```


## Not supported
- $aadToken
- extension (%varname) environment variables


## Supported Rest-Client settings

It's lies, only `environmentVariables` is currently supported.

Below are defaults.

```json
{
  "rest-client.certificates": {},
  "rest-client.environmentVariables": {
    "$shared": {}
  },
  "rest-client.decodeEscapedUnicodeCharacters": false,
  "rest-client.defaultHeaders": {
    "User-Agent": "vscode-restclient"
  },
  "rest-client.excludeHostsForProxy": [],
  "rest-client.followredirect": true,
  "rest-client.formParamEncodingStrategy": "always",
  "rest-client.rememberCookiesForSubsequentRequests": true,
  "rest-client.timeoutinmilliseconds": 0,
}
```


## TODO

There's a lot to do to complete this tool. Most of these are things that are 
missing to make it more compatible with the plugin.

Feel free to jump in on any of these.

- just use yargs already
- variables should be recursively interpolated when used - instead of statically
- GraphQL support
- multipart file loading support
- cookies??
- more doc comments
- better readme docs
- interpolating `{{$shared name}}` in environment files

Per-request settings:
  - escaped unicode
  - follow redirects
  - form param encoding
  - preview option (overrides CLI + settings)
  - remember cookies
  - timeout

Tests:
  - functions
  - request (fill, slug, body)
  - restfile
  - utils (basicAuth, bodyAsString, ServerError)
  - parser (out-of-order, iterator, get)

CLI options:
  - timeout
  - config file
  - disable confirm prompts
  - save to folder (optionally just files or everything)

Settings:
  - certificates
  - escaped unicode
  - default headers
  - follow redirects
  - form param encoding
  - preview option (overridden by CLI + per-request setting)
  - proxy exclude hosts
  - remember cookies
  - timeout
  