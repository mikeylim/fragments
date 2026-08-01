# Fragments

Fragments is a cloud-native REST API for creating, retrieving, converting, and deleting authenticated users’ text and JSON fragments. It uses Node.js, Express, Amazon Cognito, AWS S3, Docker, Jest, Hurl, and GitHub Actions.

## Project Setup

Install dependencies:

```bash
npm install
```

## Available Scripts

### Run ESLint

Checks JavaScript files in the `src/` folder for linting errors.

```bash
npm run lint
```

Run this before committing code.

---

### Start Server

Starts the server normally.

```bash
npm start
```

Server runs at:

```bash
http://localhost:8080
```

Stop the server with:

```bash
CTRL + C
```

---

### Development Mode

Starts the server in watch mode. The server automatically restarts when files are changed.

```bash
npm run dev
```

Uses environment variables from `.env.debug`:

```env
FRAGMENTS_LOG_LEVEL=debug
```

---

### Debug Mode

Starts the server in debug mode with the Node inspector enabled on port `9229`.

```bash
npm run debug
```

This script is used for VSCode debugging.

## VSCode Debugging

1. Open the project in VSCode
2. Go to **Run and Debug**
3. Select:

```text
Debug via npm run debug
```

4. Add breakpoints in files like:

```text
src/app.js
```

5. Start debugging
6. Open:

```bash
http://localhost:8080
```

or run:

```bash
curl localhost:8080
```

The breakpoint should be hit automatically.

---

## Test the Server

Run:

```bash
curl localhost:8080
```

Expected output:

```json
{
	"status": "ok",
	"description": "fragments service running normally",
	"author": "YOUR_NAME",
	"githubUrl": "https://github.com/YOUR_GITHUB_USERNAME/fragments",
	"version": "0.0.1",
	"timestamp": "2026-01-02T16:07:54.483Z"
}
```

Pretty-print JSON output with `jq`:

```bash
curl -s localhost:8080 | jq
```

Check HTTP headers:

```bash
curl -i localhost:8080
```

On Windows PowerShell, use:

```bash
curl.exe localhost:8080
```

---

## Important Notes

- Update the `author` field in `package.json`
- Update `githubUrl` in `src/app.js`
- Do not commit `node_modules/`
- Use specific `git add` commands instead of `git add .`
- Stop running servers before starting another script
- Prettier formats files automatically on save in VSCode

## Assignment 2 API Support

This release accepts any `text/*` content type and `application/json`. Fragment bodies are stored as raw buffers.

```text
POST /v1/fragments
GET  /v1/fragments
GET  /v1/fragments?expand=1
GET  /v1/fragments/:id
GET  /v1/fragments/:id/info
GET  /v1/fragments/:id.html
```

The `.html` extension converts a stored `text/markdown` fragment with `markdown-it`. The converted representation is returned without replacing the original data.

## Docker

The production image uses a multi-stage build, installs production dependencies only, and runs as the non-root `node` user. Cognito settings and `API_URL` must be supplied at runtime; they are never copied into the image.

Build for the local machine:

```bash
docker build -t fragments:local .
```

Build both EC2 AMD64 and Apple Silicon ARM64 variants without pushing:

```bash
docker buildx build --platform linux/amd64,linux/arm64 --output type=oci,dest=/tmp/fragments.tar .
```

The GitHub Actions workflow publishes `main`, `latest`, and commit-SHA tags to `mikedohyunlim/fragments` after lint, tests, and Dockerfile lint pass on a push to `main`.

---

## Project Structure

```text
fragments/
│
├── src/
│   ├── app.js
│   ├── logger.js
│   └── server.js
│
├── .vscode/
│   ├── settings.json
│   └── launch.json
│
├── .env.debug
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs
├── package.json
└── README.md
```
