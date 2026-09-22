// Only the Codespaces web client reaches the forwarded port through
// app.github.dev, where GitHub requires an auth cookie that an iframe cannot
// obtain by itself. Desktop VS Code connected to a codespace gets a localhost
// tunnel instead, and Gitpod or a local run never go through GitHub at all.
const isCodespacesWeb = (externalUri) =>
    process.env.CODESPACES === "true" &&
    externalUri.scheme === "https" &&
    /\.app\.github\.dev$/.test(externalUri.authority)

module.exports = { isCodespacesWeb }
