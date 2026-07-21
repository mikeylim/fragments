# Authenticated POST of a JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
test-user1@fragments-testing.com:test-password1
{
  "lab": 8,
  "message": "JSON integration test"
}

# The JSON fragment should be created successfully
HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
[Captures]
url: header "Location"

# Retrieve the JSON fragment from its captured Location URL
GET {{url}}
[BasicAuth]
test-user1@fragments-testing.com:test-password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
jsonpath "$.lab" == 8
jsonpath "$.message" == "JSON integration test"
