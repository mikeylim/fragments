# Assignment 3 text, JSON, and YAML integration tests
# This lifecycle covers every required non-image source type and conversion.
# It captures its own fragment IDs and removes only the fragments it creates,
# so it is safe to run in parallel with the existing integration test files.

# 1. Protected list routes reject a request without authentication.
GET http://localhost:8080/v1/fragments

HTTP/1.1 401
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401
jsonpath "$.error.message" == "Unauthorized"

# 2. Create a plain-text fragment and capture its metadata invariants.
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`Assignment 3 plain fragment.`

HTTP/1.1 201
[Captures]
plain_url: header "Location"
plain_id: jsonpath "$.fragment.id"
plain_owner: jsonpath "$.fragment.ownerId"
plain_created: jsonpath "$.fragment.created"
plain_updated: jsonpath "$.fragment.updated"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 28

# 3. Read the original plain-text data.
GET {{plain_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Assignment 3 plain fragment."

# 4. A plain-text fragment supports its .txt representation.
GET {{plain_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Assignment 3 plain fragment."

# 5. Read the fragment metadata before updating it.
GET {{plain_url}}/info
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{plain_id}}"
jsonpath "$.fragment.ownerId" == "{{plain_owner}}"
jsonpath "$.fragment.created" == "{{plain_created}}"
jsonpath "$.fragment.updated" == "{{plain_updated}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 28

# 6. Create a Markdown fragment.
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`# Assignment 3`

HTTP/1.1 201
[Captures]
markdown_url: header "Location"
markdown_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 14

# 7. Read the original Markdown.
GET {{markdown_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/markdown; charset=utf-8
[Asserts]
body == "# Assignment 3"

# 8. Markdown supports its original .md representation.
GET {{markdown_url}}.md
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/markdown; charset=utf-8
[Asserts]
body == "# Assignment 3"

# 9. Convert Markdown to HTML.
GET {{markdown_url}}.html
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/html
[Asserts]
body contains "<h1>Assignment 3</h1>"

# 10. Convert Markdown to plain text.
GET {{markdown_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body == "Assignment 3"

# 11. Markdown cannot be converted to JSON.
GET {{markdown_url}}.json
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "unsupported fragment conversion"

# 12. Create an HTML fragment.
POST http://localhost:8080/v1/fragments
Content-Type: text/html
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`<h1>Assignment 3</h1><p>HTML fragment.</p>`

HTTP/1.1 201
[Captures]
html_url: header "Location"
html_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/html"

# 13. Read the original HTML.
GET {{html_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/html; charset=utf-8
[Asserts]
body contains "<p>HTML fragment.</p>"

# 14. HTML supports its original .html representation.
GET {{html_url}}.html
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/html; charset=utf-8
[Asserts]
body contains "<h1>Assignment 3</h1>"

# 15. Convert HTML to plain text.
GET {{html_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "HTML fragment."

# 16. Create a CSV fragment with a header and two records.
POST http://localhost:8080/v1/fragments
Content-Type: text/csv
[BasicAuth]
test-user1@fragments-testing.com: test-password1
```
name,score
Mike,100
Ada,98
```

HTTP/1.1 201
[Captures]
csv_url: header "Location"
csv_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/csv"

# 17. Read the original CSV.
GET {{csv_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/csv; charset=utf-8
[Asserts]
body contains "name,score"
body contains "Mike,100"

# 18. CSV supports its original .csv representation.
GET {{csv_url}}.csv
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/csv; charset=utf-8
[Asserts]
body contains "Ada,98"

# 19. Convert CSV to readable plain text.
GET {{csv_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "name,score"
body contains "Mike,100"

# 20. Convert CSV records to JSON.
GET {{csv_url}}.json
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
jsonpath "$[0].name" == "Mike"
jsonpath "$[0].score" == "100"
jsonpath "$[1].name" == "Ada"
jsonpath "$[1].score" == "98"

# 21. Create a JSON fragment.
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
test-user1@fragments-testing.com: test-password1
{
  "course": "CCP555",
  "assignment": 3
}

HTTP/1.1 201
[Captures]
json_url: header "Location"
json_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"

# 22. Read the original JSON.
GET {{json_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
jsonpath "$.course" == "CCP555"
jsonpath "$.assignment" == 3

# 23. JSON supports its original .json representation.
GET {{json_url}}.json
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
jsonpath "$.course" == "CCP555"
jsonpath "$.assignment" == 3

# 24. Convert JSON to YAML using .yaml.
GET {{json_url}}.yaml
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "course: CCP555"
body contains "assignment: 3"

# 25. Convert JSON to YAML using the .yml alias.
GET {{json_url}}.yml
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "course: CCP555"
body contains "assignment: 3"

# 26. Convert JSON to readable plain text.
GET {{json_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "\"course\""
body contains "\"CCP555\""

# 27. Create a YAML fragment.
POST http://localhost:8080/v1/fragments
Content-Type: application/yaml
[BasicAuth]
test-user1@fragments-testing.com: test-password1
```
course: CCP555
assignment: 3
```

HTTP/1.1 201
[Captures]
yaml_url: header "Location"
yaml_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/yaml"

# 28. Read the original YAML.
GET {{yaml_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "course: CCP555"
body contains "assignment: 3"

# 29. YAML supports its original .yaml representation.
GET {{yaml_url}}.yaml
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "course: CCP555"

# 30. Convert YAML to readable plain text.
GET {{yaml_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "assignment: 3"

# 31. The specification does not define .yml for a stored YAML fragment.
GET {{yaml_url}}.yml
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "unsupported fragment conversion"

# 32. The unexpanded list contains every fragment created by this scenario.
GET http://localhost:8080/v1/fragments
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" contains "{{plain_id}}"
jsonpath "$.fragments" contains "{{markdown_id}}"
jsonpath "$.fragments" contains "{{html_id}}"
jsonpath "$.fragments" contains "{{csv_id}}"
jsonpath "$.fragments" contains "{{json_id}}"
jsonpath "$.fragments" contains "{{yaml_id}}"

# 33. The expanded list contains metadata objects for the captured IDs and types.
GET http://localhost:8080/v1/fragments?expand=1
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments[*].id" contains "{{plain_id}}"
jsonpath "$.fragments[*].id" contains "{{markdown_id}}"
jsonpath "$.fragments[*].id" contains "{{html_id}}"
jsonpath "$.fragments[*].id" contains "{{csv_id}}"
jsonpath "$.fragments[*].id" contains "{{json_id}}"
jsonpath "$.fragments[*].id" contains "{{yaml_id}}"
jsonpath "$.fragments[*].type" contains "text/plain"
jsonpath "$.fragments[*].type" contains "text/markdown"
jsonpath "$.fragments[*].type" contains "text/html"
jsonpath "$.fragments[*].type" contains "text/csv"
jsonpath "$.fragments[*].type" contains "application/json"
jsonpath "$.fragments[*].type" contains "application/yaml"

# 34. A second authenticated user cannot read the first user's fragment.
GET {{plain_url}}
[BasicAuth]
test-user2@fragments-testing: test-password2

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "fragment not found"

# 35. Replace the plain-text fragment without changing its identity or type.
PUT {{plain_url}}
Content-Type: text/plain; charset=utf-8
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`Updated Assignment 3 fragment.`

HTTP/1.1 200
[Captures]
plain_new_updated: jsonpath "$.fragment.updated"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{plain_id}}"
jsonpath "$.fragment.ownerId" == "{{plain_owner}}"
jsonpath "$.fragment.created" == "{{plain_created}}"
jsonpath "$.fragment.updated" != "{{plain_updated}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 30

# 36. Read the replacement data.
GET {{plain_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Updated Assignment 3 fragment."

# 37. The updated metadata retains its invariants and exposes the new values.
GET {{plain_url}}/info
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.fragment.id" == "{{plain_id}}"
jsonpath "$.fragment.ownerId" == "{{plain_owner}}"
jsonpath "$.fragment.created" == "{{plain_created}}"
jsonpath "$.fragment.updated" == "{{plain_new_updated}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 30

# 38. PUT cannot change a fragment's Content-Type.
PUT {{plain_url}}
Content-Type: application/json
[BasicAuth]
test-user1@fragments-testing.com: test-password1
{
  "changed": true
}

HTTP/1.1 400
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 400
jsonpath "$.error.message" == "fragment Content-Type cannot be changed"

# 39. PUT returns 404 for a missing fragment.
PUT http://localhost:8080/v1/fragments/00000000-0000-4000-8000-000000000000
Content-Type: text/plain
[BasicAuth]
test-user1@fragments-testing.com: test-password1
`missing fragment`

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "fragment not found"

# 40. Delete the updated plain-text fragment.
DELETE {{plain_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 41. The deleted fragment is no longer readable.
GET {{plain_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "fragment not found"

# 42. Remove the Markdown fragment created by this scenario.
DELETE {{markdown_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200

# 43. Remove the HTML fragment created by this scenario.
DELETE {{html_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200

# 44. Remove the CSV fragment created by this scenario.
DELETE {{csv_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200

# 45. Remove the JSON fragment created by this scenario.
DELETE {{json_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200

# 46. Remove the YAML fragment created by this scenario.
DELETE {{yaml_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200

# 47. Confirm that this scenario removed all six of its fragment IDs.
GET http://localhost:8080/v1/fragments
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments" not contains "{{plain_id}}"
jsonpath "$.fragments" not contains "{{markdown_id}}"
jsonpath "$.fragments" not contains "{{html_id}}"
jsonpath "$.fragments" not contains "{{csv_id}}"
jsonpath "$.fragments" not contains "{{json_id}}"
jsonpath "$.fragments" not contains "{{yaml_id}}"
