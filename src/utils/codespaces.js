const https = require("https")
const fs = require("fs")
const logger = require("./console")

// Where the codespace agent keeps the current secrets (values are base64).
const ENV_SECRETS_PATH = "/workspaces/.codespaces/shared/.env-secrets"
const REQUEST_TIMEOUT_MS = 5000

const isCodespaces = () =>
    process.env.CODESPACES === "true" &&
    Boolean(process.env.CODESPACE_NAME) &&
    Boolean(process.env.GITHUB_TOKEN)

// Only the web client reaches the port through app.github.dev. Desktop VS Code
// connected to a codespace gets a localhost tunnel, where no auth is needed.
const isForwardedPortUri = (uri) =>
    uri.scheme === "https" && /\.app\.github\.dev$/.test(uri.authority)

// GITHUB_TOKEN rotates during the codespace lifetime and process.env is a
// snapshot taken when the extension host started, so fall back to the file.
const readRotatedToken = () => {
    try {
        const content = fs.readFileSync(ENV_SECRETS_PATH, "utf8")
        const line = content.split(/\r?\n/).find(l => l.startsWith("GITHUB_TOKEN="))
        if (!line) return null
        // the file has been seen with base64 values; accept plain text too
        const raw = line.slice("GITHUB_TOKEN=".length).trim()
        const decoded = Buffer.from(raw, "base64").toString("utf8").trim()
        const looksLikeToken = v => /^gh[a-z]_[A-Za-z0-9_]+$/.test(v)
        if (looksLikeToken(decoded)) return decoded
        if (looksLikeToken(raw)) return raw
        return null
    } catch (error) {
        return null
    }
}

const postJson = (url, token, body) => new Promise((resolve) => {
    const payload = JSON.stringify(body)
    const req = https.request(url, {
        method: "POST",
        headers: {
            "Authorization": `bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            // GitHub rejects requests without a user agent
            "User-Agent": "learnpack-vscode",
        },
    }, (res) => {
        let data = ""
        res.setEncoding("utf8")
        res.on("data", chunk => { data += chunk })
        res.on("end", () => resolve({ status: res.statusCode, body: data }))
    })
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("timeout")))
    req.on("error", error => resolve({ status: 0, body: "", error }))
    req.write(payload)
    req.end()
})

/**
 * Mint the "basis" token that the app.github.dev postback exchanges for the
 * private-port auth cookie. Same internal endpoint GitHub's own port-forwarding
 * helper calls. Resolves null on any failure: never rejects, never logs the token.
 */
const mintPortToken = async (port) => {
    const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com"
    const url = `${apiUrl}/codespaces_internal/${process.env.CODESPACE_NAME}/ports/token`
    const body = { port: String(port), token_type: "basis" }

    let response = await postJson(url, process.env.GITHUB_TOKEN, body)
    if (response.status === 401) {
        const rotated = readRotatedToken()
        if (rotated && rotated !== process.env.GITHUB_TOKEN) {
            logger.debug("Codespaces: GITHUB_TOKEN rejected, retrying with the rotated token")
            response = await postJson(url, rotated, body)
        }
    }

    if (response.error) {
        logger.warn(`Codespaces: port token request failed: ${response.error.message}`)
        return null
    }
    if (response.status !== 200) {
        logger.warn(`Codespaces: port token request returned ${response.status}`)
        return null
    }
    try {
        const parsed = JSON.parse(response.body)
        if (!parsed.token) {
            logger.warn("Codespaces: port token response has no token")
            return null
        }
        logger.debug(`Codespaces: port token minted (skipAntiPhishing=${parsed.skipAntiPhishing})`)
        return { token: parsed.token, skipAntiPhishing: Boolean(parsed.skipAntiPhishing) }
    } catch (error) {
        logger.warn("Codespaces: port token response is not JSON")
        return null
    }
}

// Postback endpoint on the forwarded-port host. `target` is the path+query to
// land on once the cookie is set; GitHub's helper sends a relative path here.
const buildPostbackUrl = (externalUri, target) =>
    `${externalUri.scheme}://${externalUri.authority}/auth/postback/tunnel?rd=${encodeURIComponent(target)}&tunnel=1`

module.exports = { isCodespaces, isForwardedPortUri, mintPortToken, buildPostbackUrl }
