# Authenticated POST using a text Content-Type with a charset
POST http://localhost:8080/v1/fragments
Content-Type: text/plain; charset=utf-8
[BasicAuth]
test-user1@fragments-testing.com:test-password1
`Charset fragment!`

# The fragment should be created successfully
HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain; charset=utf-8"
# 'Charset fragment!' is 17 bytes in UTF-8
jsonpath "$.fragment.size" == 17
[Captures]
url: header "Location"

# Retrieve the fragment and verify that its charset is retained
GET {{url}}
[BasicAuth]
test-user1@fragments-testing.com:test-password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
Content-Length: 17
[Asserts]
body == "Charset fragment!"
