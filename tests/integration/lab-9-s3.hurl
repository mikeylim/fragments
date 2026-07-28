# Lab 9 S3 integration test
# This request creates a text fragment whose data will be stored in S3.
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
test-user1@fragments-testing.com:test-password1
`Hello S3!`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
# "Hello S3!" is 9 bytes.
jsonpath "$.fragment.size" == 9
[Captures]
# Save the Location header for the following GET and DELETE requests.
url: header "Location"

# Confirm that the object can be read back from S3.
GET {{url}}
[BasicAuth]
test-user1@fragments-testing.com:test-password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Hello S3!"

# Delete the fragment metadata and its S3 object.
DELETE {{url}}
[BasicAuth]
test-user1@fragments-testing.com:test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# The fragment must no longer be available.
GET {{url}}
[BasicAuth]
test-user1@fragments-testing.com:test-password1

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404