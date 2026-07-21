# Authenticated POST using an unsupported fragment type
POST http://localhost:8080/v1/fragments
Content-Type: application/pdf
[BasicAuth]
test-user1@fragments-testing.com:test-password1
`This content is not a supported PDF fragment.`

# application/pdf is not supported by the current fragments release
HTTP/1.1 415
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "unsupported fragment type"
