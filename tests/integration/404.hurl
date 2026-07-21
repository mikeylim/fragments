# Unknown Route Test
GET http://localhost:8080/no-such-route

# The application should return a structured 404 response
HTTP/1.1 404
Content-Type: application/json; charset=utf-8

[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "not found"
