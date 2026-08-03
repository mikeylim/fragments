# Lab 10 DynamoDB integration test
# 1. Create a JSON fragment for the authorized user.
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`{ "service": "DynamoDB" }`

HTTP/1.1 201
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.ownerId" matches "^[0-9a-f]{64}$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" == "application/json"
# The exact JSON text above is 25 bytes, including its spaces.
jsonpath "$.fragment.size" == 25

# 2. Confirm that DynamoDB returns all metadata for the JSON fragment.
GET {{fragment1_url}}/info
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment1_id}}"
jsonpath "$.fragment.ownerId" matches "^[0-9a-f]{64}$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25

# 3. Create a Markdown fragment for the same authorized user.
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`DynamoDB is **great**.`

HTTP/1.1 201
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.ownerId" matches "^[0-9a-f]{64}$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22

# 4. Confirm that DynamoDB returns all metadata for the Markdown fragment.
GET {{fragment2_url}}/info
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment2_id}}"
jsonpath "$.fragment.ownerId" matches "^[0-9a-f]{64}$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22

# 5. Confirm that an unexpanded list contains both fragment IDs.
GET http://localhost:8080/v1/fragments
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" contains "{{fragment1_id}}"
jsonpath "$.fragments" contains "{{fragment2_id}}"

# 6. Delete only the first fragment.
DELETE {{fragment1_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 7. Confirm that the first fragment can no longer be retrieved.
GET {{fragment1_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 8. Confirm that only the first test fragment was deleted.
GET http://localhost:8080/v1/fragments
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" not contains "{{fragment1_id}}"
jsonpath "$.fragments" contains "{{fragment2_id}}"
