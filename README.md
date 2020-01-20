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
    console.log(response.body);
})();
```


## Node v8

This uses async iterators and therefore only supports Node v10.
Note, as of January 2020, Node v8 is end-of-life and unsupported.
If you really need Node v8, you can hack a solution with the
`--harmony_async_iterator` flag.

Something like:

```sh
echo "#!/usr/bin/node --harmony_async_iterator" > rest-cli
echo "require('rest-cli').main()" >> rest-cli
chmod +x rest-cli
./rest-cli
```


## HTTP Lanaguage

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
- aadToken
- extension environment variables


## TODO
- variables are not file scoped
- date custom formats should require quotes "" around them
- automatic basic auth?
- functions (aka. dynamic variables)
- shared variables, environment files
- pretty formatting XML/JSON in response bodies
- GraphQL support
- multipart file loading support
- cookies??
- cli options for:
  - environment file
  - config file
- config file:
  - followRedirects
  - defaultHeaders?
  - proxy?
  - show/hide stats
  - show/hide request [slug, headers, body]
  - show/hide response [slug, headers, body]