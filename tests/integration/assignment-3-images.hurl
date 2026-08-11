# Assignment 3 image fragment integration tests
# The deterministic 2x1 source images are embedded as Base64 so that the
# complete image conversion matrix can run without binary fixture files.

# 1. Create a PNG source fragment.
POST http://localhost:8080/v1/fragments
Content-Type: image/png
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAD0lEQVQImWP4z8DA8J8BAAf/Af+DgD1mAAAAAElFTkSuQmCC;

HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Captures]
png_url: header "Location"
png_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == 93

# 2. Create a JPEG source fragment.
POST http://localhost:8080/v1/fragments
Content-Type: image/jpeg
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAbEAEAAAcAAAAAAAAAAAAAAAAAAQMEBTVzsv/EABQBAQAAAAAAAAAAAAAAAAAAAAf/xAAdEQABAgcAAAAAAAAAAAAAAAAAAQMCBTI0cXKy/9oADAMBAAIRAxEAPwCjZcPQaJfMABE5WuQVm9+/vF0p/9k=;

HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Captures]
jpeg_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/jpeg"
jsonpath "$.fragment.size" == 299

# 3. Create a WebP source fragment.
POST http://localhost:8080/v1/fragments
Content-Type: image/webp
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,UklGRjwAAABXRUJQVlA4IDAAAACwAQCdASoCAAEAAUAmJaACdAEO/gLsAM4/Whd1iCP/9NI//ppH/9NI+YsrSaSSAAA=;

HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Captures]
webp_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/webp"
jsonpath "$.fragment.size" == 68

# 4. Create a GIF source fragment.
POST http://localhost:8080/v1/fragments
Content-Type: image/gif
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,R0lGODlhAgABAIEAAExpcQD/AP8AAAAAACH5BAUAAAAALAAAAAACAAEAAAICVAoAOw==;

HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Captures]
gif_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/gif"
jsonpath "$.fragment.size" == 49

# 5. Create an AVIF source fragment.
POST http://localhost:8080/v1/fragments
Content-Type: image/avif
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACwAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAIAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAA0bWRhdBIACgc4ACaQENBpMh8ZQmMEwAA0ACzsJ6kK6Om7qCNpj+ryEqeJpn8Ijysu;

HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Captures]
avif_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/avif"
jsonpath "$.fragment.size" == 294

# 6. Read the PNG metadata.
GET {{png_url}}/info
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{png_id}}"
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == 93

# 7. Read and fingerprint the original PNG bytes.
GET {{png_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count == 93
bytes startsWith hex,89504e470d0a1a0a;
sha256 == hex,688be114b07e3f44b687932cc6fec55fc655d9f6c970d62ed5ae725b470628f8;

# PNG source: exercise all five supported output formats.

# 8. PNG -> PNG
GET {{png_url}}.png
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count > 0
bytes startsWith hex,89504e470d0a1a0a;

# 9. PNG -> JPEG
GET {{png_url}}.jpg
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/jpeg
[Asserts]
bytes count > 0
bytes startsWith hex,ffd8ff;

# 10. PNG -> WebP
GET {{png_url}}.webp
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/webp
[Asserts]
bytes count > 0
bytes startsWith hex,52494646;
bytes contains hex,57454250;

# 11. PNG -> GIF
GET {{png_url}}.gif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/gif
[Asserts]
bytes count > 0
bytes startsWith hex,47494638;

# 12. PNG -> AVIF
GET {{png_url}}.avif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/avif
[Asserts]
bytes count > 0
bytes contains hex,6674797061766966;

# JPEG source: exercise all five supported output formats.

# 13. JPEG -> PNG
GET {{jpeg_url}}.png
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count > 0
bytes startsWith hex,89504e470d0a1a0a;

# 14. JPEG -> JPEG
GET {{jpeg_url}}.jpg
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/jpeg
[Asserts]
bytes count > 0
bytes startsWith hex,ffd8ff;

# 15. JPEG -> WebP
GET {{jpeg_url}}.webp
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/webp
[Asserts]
bytes count > 0
bytes startsWith hex,52494646;
bytes contains hex,57454250;

# 16. JPEG -> GIF
GET {{jpeg_url}}.gif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/gif
[Asserts]
bytes count > 0
bytes startsWith hex,47494638;

# 17. JPEG -> AVIF
GET {{jpeg_url}}.avif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/avif
[Asserts]
bytes count > 0
bytes contains hex,6674797061766966;

# WebP source: exercise all five supported output formats.

# 18. WebP -> PNG
GET {{webp_url}}.png
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count > 0
bytes startsWith hex,89504e470d0a1a0a;

# 19. WebP -> JPEG
GET {{webp_url}}.jpg
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/jpeg
[Asserts]
bytes count > 0
bytes startsWith hex,ffd8ff;

# 20. WebP -> WebP
GET {{webp_url}}.webp
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/webp
[Asserts]
bytes count > 0
bytes startsWith hex,52494646;
bytes contains hex,57454250;

# 21. WebP -> GIF
GET {{webp_url}}.gif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/gif
[Asserts]
bytes count > 0
bytes startsWith hex,47494638;

# 22. WebP -> AVIF
GET {{webp_url}}.avif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/avif
[Asserts]
bytes count > 0
bytes contains hex,6674797061766966;

# GIF source: exercise all five supported output formats.

# 23. GIF -> PNG
GET {{gif_url}}.png
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count > 0
bytes startsWith hex,89504e470d0a1a0a;

# 24. GIF -> JPEG
GET {{gif_url}}.jpg
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/jpeg
[Asserts]
bytes count > 0
bytes startsWith hex,ffd8ff;

# 25. GIF -> WebP
GET {{gif_url}}.webp
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/webp
[Asserts]
bytes count > 0
bytes startsWith hex,52494646;
bytes contains hex,57454250;

# 26. GIF -> GIF
GET {{gif_url}}.gif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/gif
[Asserts]
bytes count > 0
bytes startsWith hex,47494638;

# 27. GIF -> AVIF
GET {{gif_url}}.avif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/avif
[Asserts]
bytes count > 0
bytes contains hex,6674797061766966;

# AVIF source: exercise all five supported output formats.

# 28. AVIF -> PNG
GET {{avif_url}}.png
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count > 0
bytes startsWith hex,89504e470d0a1a0a;

# 29. AVIF -> JPEG
GET {{avif_url}}.jpg
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/jpeg
[Asserts]
bytes count > 0
bytes startsWith hex,ffd8ff;

# 30. AVIF -> WebP
GET {{avif_url}}.webp
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/webp
[Asserts]
bytes count > 0
bytes startsWith hex,52494646;
bytes contains hex,57454250;

# 31. AVIF -> GIF
GET {{avif_url}}.gif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/gif
[Asserts]
bytes count > 0
bytes startsWith hex,47494638;

# 32. AVIF -> AVIF
GET {{avif_url}}.avif
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/avif
[Asserts]
bytes count > 0
bytes contains hex,6674797061766966;

# 33. Reject an update that tries to change the PNG media type to JPEG.
PUT {{png_url}}
Content-Type: image/jpeg
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAbEAEAAAcAAAAAAAAAAAAAAAAAAQMEBTVzsv/EABQBAQAAAAAAAAAAAAAAAAAAAAf/xAAdEQABAgcAAAAAAAAAAAAAAAAAAQMCBTI0cXKy/9oADAMBAAIRAxEAPwCjZcPQaJfMABE5WuQVm9+/vF0p/9k=;

HTTP/1.1 400
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 400
jsonpath "$.error.message" == "fragment Content-Type cannot be changed"

# 34. Replace the PNG with a different, valid PNG body.
PUT {{png_url}}
Content-Type: image/png
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAD0lEQVQImWNgYPj//z8DAAj+Av7XsjM4AAAAAElFTkSuQmCC;

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{png_id}}"
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == 93

# 35. Verify that raw retrieval returns the updated PNG bytes.
GET {{png_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: image/png
[Asserts]
bytes count == 93
bytes startsWith hex,89504e470d0a1a0a;
sha256 == hex,35ce07d748b43f51b9a96c2d3041e8b0bcb0c6d700bfac00dd54b0650e13a7fc;

# 36. Reject a text conversion for an image fragment.
GET {{png_url}}.txt
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 415
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "unsupported fragment conversion"

# 37. Store bytes declared as image/png that are not a valid image.
POST http://localhost:8080/v1/fragments
Content-Type: image/png
[BasicAuth]
test-user1@fragments-testing.com: test-password1
base64,bm90IGFuIGltYWdl;

HTTP/1.1 201
Content-Type: application/json; charset=utf-8
[Captures]
invalid_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == 12

# 38. Reject conversion when the declared image bytes cannot be decoded.
GET {{invalid_url}}.jpg
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 415
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" == "fragment conversion failed"

# Delete every fragment created by this file so parallel Hurl runs are isolated.

# 39. Delete the PNG source.
DELETE {{png_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"

# 40. Delete the JPEG source.
DELETE {{jpeg_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"

# 41. Delete the WebP source.
DELETE {{webp_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"

# 42. Delete the GIF source.
DELETE {{gif_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"

# 43. Delete the AVIF source.
DELETE {{avif_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"

# 44. Delete the fragment containing invalid image bytes.
DELETE {{invalid_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"

# 45. Confirm that a representative deleted image is no longer available.
GET {{png_url}}
[BasicAuth]
test-user1@fragments-testing.com: test-password1

HTTP/1.1 404
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "fragment not found"
