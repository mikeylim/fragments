# POST without an Authorization header
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
`An unauthenticated fragment must not be created.`

# Protected API routes must reject unauthenticated requests
HTTP/1.1 401
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401
jsonpath "$.error.message" == "Unauthorized"
