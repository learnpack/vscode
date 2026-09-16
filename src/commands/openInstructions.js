const vscode = require('vscode');
const crypto = require('crypto');
const logger = require('../utils/console')
const lp = require('../learnpack')
const history = require('../utils/history')
const codespaces = require('../utils/codespaces')

let instructionsPanel = null
let instructionsEvent = null
let messageEvent = null
let lastAuthAt = 0

let forcedToActiveEditor = null
let activeEditorEvent = null

// The private-port cookie GitHub sets lasts 3 hours; re-authenticate a hidden
// panel that comes back after most of that window has elapsed.
const REAUTH_AFTER_MS = 150 * 60 * 1000

const reveal = () => {
    logger.debug(`Revealing instructions from column ${instructionsPanel.viewColumn} to 2`)

    if (instructionsPanel.visible) {
        logger.debug(`Focusing intructions`)
        instructionsPanel.reveal(vscode.ViewColumn.Two, false)
        instructionsPanel.webview.postMessage({ command: 'focusContent' })
    }

    if (!instructionsPanel.visible) {
        logger.debug(`Revealing instructions`)
        instructionsPanel.reveal(vscode.ViewColumn.Two, true)//preserve=true (avoid taking focus)
    }

    return instructionsPanel
}
module.exports = async () => {

    logger.debug("opening", extension.workspaceRoot)
    if (history.noOpenedFies()) await vscode.commands.executeCommand(`${extension.name}.openWelcome`)

    if (instructionsPanel) return reveal()

    // Create and show a new webview
    instructionsPanel = vscode.window.createWebviewPanel(
        `${extension.name}-instructions`, // Identifies the type of the webview. Used internally
        `${extension.title} Instructions`, // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
        {
            enableScripts: true,
            preserveFocus: false,//preserve=true (avoid taking focus)
            // keep the iframe alive while hidden: re-rendering the same html would
            // resubmit a stale port token, and the IDE would lose its state anyway
            retainContextWhenHidden: true,
            // localResourceRoots: [
            //     vscode.Uri.joinPath(extensionUri, 'media')
            // ]
        } // Webview options. More on these later.
    );

    // And set its HTML content
    instructionsPanel.webview.html = getWebviewContent();

    lp.setInstructionsPanel(instructionsPanel)

    // the webview asks for the frame once its script is up
    messageEvent = instructionsPanel.webview.onDidReceiveMessage(message => {
        if (message && message.command === 'ready') loadFrame()
    })

    instructionsEvent = instructionsPanel.onDidChangeViewState(e => {
        if (!e.webviewPanel.visible || !lastAuthAt) return
        if (Date.now() - lastAuthAt > REAUTH_AFTER_MS) loadFrame()
    })

    activeEditorEvent = vscode.window.onDidChangeActiveTextEditor(async visibleEditor => {

        // logger.debug(`Instructions are opened on column ${instructionsPanel.viewColumn}`)
        // if(instructionsPanel.viewColumn === vscode.ViewColumn.One) reveal()

        // this will avoid moving the same editor twice
        if ((forcedToActiveEditor === visibleEditor) || !visibleEditor) return;

        logger.debug(`New active editor in column ${visibleEditor.viewColumn} != ${vscode.ViewColumn.One}`)
        if (visibleEditor.viewColumn != vscode.ViewColumn.One) {
            logger.debug("Moving to the side")
            const doc = visibleEditor.document
            await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
            forcedToActiveEditor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One, false)
        }

    })

    // console.log("visible editors", vscode.window.visibleTextEditors())

    instructionsPanel.onDidDispose(() => {
        instructionsPanel = null
        lastAuthAt = 0
        if (instructionsEvent) instructionsEvent.dispose()
        if (messageEvent) messageEvent.dispose()
        if (activeEditorEvent) activeEditorEvent.dispose()
        instructionsEvent = null
        messageEvent = null
        activeEditorEvent = null
    })

    // make sure instructions are visible and on the side
    reveal()

    return instructionsPanel

}

/**
 * Tell the webview what to put in the iframe.
 *
 * On the Codespaces web client the forwarded port is private and GitHub only
 * serves it once an auth cookie exists. Its own sign-in helper cannot set that
 * cookie from inside an iframe (it hops through github.com, which refuses to be
 * framed), so we do the exchange ourselves: mint the port token from the
 * extension host and let the webview POST it to the postback, targeting the
 * iframe. Everywhere else the iframe just loads the url.
 */
async function loadFrame() {
    if (!instructionsPanel) return

    const { config } = lp.config()
    const cacheBuster = Date.now()
    const target = `/?config=&nonce=${cacheBuster}`
    const url = `http://localhost:${config.port}`

    logger.log(`Loading app running on ${url}`)
    const externalUri = await vscode.env.asExternalUri(vscode.Uri.parse(url));
    if (!instructionsPanel) return

    if (codespaces.isCodespaces() && codespaces.isForwardedPortUri(externalUri)) {
        const auth = await codespaces.mintPortToken(config.port)
        if (!instructionsPanel) return
        if (auth) {
            lastAuthAt = Date.now()
            instructionsPanel.webview.postMessage({
                command: 'authenticate',
                action: codespaces.buildPostbackUrl(externalUri, target),
                token: auth.token,
            })
            return
        }
        logger.warn("Could not authenticate the forwarded port, loading the iframe directly")
    }

    lastAuthAt = 0
    const base = externalUri.toString().replace(/\/$/, '')
    instructionsPanel.webview.postMessage({ command: 'load', src: `${base}${target}` })
}

function getWebviewContent() {

    const cspNonce = crypto.randomBytes(16).toString('base64')

    return `
	<!DOCTYPE html>
	<html>
		<head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${cspNonce}'; frame-src https: http:; form-action https:;">
		</head>
		<body style="padding: 0; border: 0;margin: 0;height: 100vh;">
            <iframe
                name="learnpack-frame"
                class="iframe-content"
                style="border: 0;margin: 0;height: 100vh;"
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups"
                width="100%" height="100%"
            ></iframe>

            <form id="pf-auth" method="POST" target="learnpack-frame" hidden>
                <input type="hidden" name="accessToken">
                <input type="hidden" name="skipAntiPhishing" value="on">
            </form>

            <script nonce="${cspNonce}">

            const vscode = acquireVsCodeApi();
            const iframe = document.querySelector('.iframe-content');
            const form = document.getElementById('pf-auth');

            // Handle the message inside the webview
            window.addEventListener('message', event => {

                const message = event.data; // The JSON data our extension sent

                switch (message.command) {
                    case 'load':
                        iframe.src = message.src;
                        break;
                    case 'authenticate':
                        // same exchange GitHub's port-forwarding helper does, minus
                        // the github.com hop that cannot complete inside an iframe
                        form.action = message.action;
                        form.elements.accessToken.value = message.token;
                        form.submit();
                        form.elements.accessToken.value = '';
                        break;
                    case 'focusContent':
                        try {
                            iframe.focus()
                            console.log("Iframe focused!")
                        } catch (error) {
                            console.error('Error focusing content:', error);
                        }
                        break;
                }
            });

            vscode.postMessage({ command: 'ready' });
        </script>
		</body>
	</html>`

}
