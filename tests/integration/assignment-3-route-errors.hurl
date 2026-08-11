# Assignment 3 authentication, isolation, and route error integration tests
# This file owns and removes every fragment it creates, so it can run in parallel.

# 1. The second test user starts with an empty fragment list in a fresh stack.
GET http://localhost:8080/v1/fragments
[BasicAuth]
test-user2@fragments-testing: test-password2

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" isEmpty

# 2. Create a fragment that belongs only to user 1.
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`Private Assignment 3 fragment.`

HTTP/1.1 201
[Captures]
private_url: header "Location"
private_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"

# 3. User 2 cannot read user 1's raw fragment.
GET {{private_url}}
[BasicAuth]
test-user2@fragments-testing: test-password2

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "fragment not found"

# 4. User 2 cannot read user 1's metadata.
GET {{private_url}}/info
[BasicAuth]
test-user2@fragments-testing: test-password2

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 5. User 2 cannot update user 1's fragment.
PUT {{private_url}}
Content-Type: text/plain
[BasicAuth]
test-user2@fragments-testing: test-password2
`Unauthorized replacement`

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 6. User 2 cannot delete user 1's fragment.
DELETE {{private_url}}
[BasicAuth]
test-user2@fragments-testing: test-password2

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 7. The owner's fragment remains unchanged after the rejected operations.
GET {{private_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Private Assignment 3 fragment."

# 8. A missing fragment's metadata returns 404.
GET http://localhost:8080/v1/fragments/00000000-0000-4000-8000-000000000000/info
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 9. Deleting a missing fragment returns 404.
DELETE http://localhost:8080/v1/fragments/00000000-0000-4000-8000-000000000000
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 10. An update without the matching Content-Type returns 400.
PUT {{private_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`Missing Content-Type`

HTTP/1.1 400
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 400
jsonpath "$.error.message" == "fragment Content-Type cannot be changed"

# 11. Invalid JSON bytes can be stored as raw fragment data.
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`not valid JSON`

HTTP/1.1 201
[Captures]
invalid_json_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"

# 12. Conversion rejects invalid JSON instead of returning corrupt YAML.
GET {{invalid_json_url}}.yaml
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 415
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "fragment conversion failed"

# 13. Raw GET requires authentication.
GET {{private_url}}

HTTP/1.1 401
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401

# 14. PUT requires authentication.
PUT {{private_url}}
Content-Type: text/plain
`Unauthenticated update`

HTTP/1.1 401
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401

# 15. DELETE requires authentication.
DELETE {{private_url}}

HTTP/1.1 401
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401

# 16. POST without a supported Content-Type returns 415.
POST http://localhost:8080/v1/fragments
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`Missing Content-Type`

HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "unsupported fragment type"

# 17. Remove the invalid JSON fragment created by this scenario.
DELETE {{invalid_json_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 18. Remove user 1's private fragment.
DELETE {{private_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 19. A second DELETE of the removed fragment returns 404.
DELETE {{private_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 20. The captured private ID is no longer in user 1's list.
GET http://localhost:8080/v1/fragments
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments" not contains "{{private_id}}"

# 21. Arbitrary text/* media types remain supported for raw storage.
POST http://localhost:8080/v1/fragments
Content-Type: text/x-assignment3
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`Custom text fragment`

HTTP/1.1 201
[Captures]
custom_text_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/x-assignment3"

# 22. The arbitrary text fragment can be retrieved in its original type.
GET {{custom_text_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/x-assignment3; charset=utf-8
[Asserts]
body == "Custom text fragment"

# 23. An unspecified conversion is rejected for an arbitrary text type.
GET {{custom_text_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415

# 24. Remove the arbitrary text fragment created by this scenario.
DELETE {{custom_text_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
