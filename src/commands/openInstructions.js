const vscode = require('vscode');
const crypto = require('crypto');
const logger = require('../utils/console')
const lp = require('../learnpack')
const history = require('../utils/history')
const codespaces = require('../utils/codespaces')

let instructionsPanel = null
let instructionsEvent = null
let messageEvent = null
let windowStateEvent = null

let forcedToActiveEditor = null
let activeEditorEvent = null

// where the IDE is reachable from the user's browser, resolved in loadFrame()
let externalUri = null
let frameSrc = null
// true on the Codespaces web client, where the iframe needs a gate screen
let gated = false
// set when the user opened the IDE in a tab and we wait for them to come back
let awaitingReturn = false
let lastLoadAt = 0

// GitHub's private-port cookie lasts 3 hours; a panel shown again after that
// gets the gate screen back instead of a broken iframe.
const COOKIE_LIFETIME_MS = 3 * 60 * 60 * 1000

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
            // keep the gate screen and the loaded IDE alive while the panel is hidden
            retainContextWhenHidden: true,
            // localResourceRoots: [
            //     vscode.Uri.joinPath(extensionUri, 'media')
            // ]
        } // Webview options. More on these later.
    );

    // And set its HTML content
    instructionsPanel.webview.html = getWebviewContent();

    lp.setInstructionsPanel(instructionsPanel)

    messageEvent = instructionsPanel.webview.onDidReceiveMessage(message => {
        if (!message) return
        switch (message.command) {
            // the webview script is up and asks what to show
            case 'ready':
                loadFrame()
                break
            // "Open in a new tab": GitHub sets its cookie there, then we load the iframe
            case 'openExternal':
                if (!externalUri) return
                awaitingReturn = true
                vscode.env.openExternal(externalUri).then(opened => {
                    if (!opened) logger.warn("Could not open the IDE in the browser")
                }, error => logger.warn(`Could not open the IDE in the browser: ${error.message}`))
                break
            // "Show them here"
            case 'showFrame':
                postLoad()
                break
        }
    })

    // the user came back from the tab: load the iframe without a second click
    windowStateEvent = vscode.window.onDidChangeWindowState(e => {
        if (e.focused && awaitingReturn && instructionsPanel) postLoad()
    })

    instructionsEvent = instructionsPanel.onDidChangeViewState(e => {
        if (!e.webviewPanel.visible || !gated || !lastLoadAt) return
        if (Date.now() - lastLoadAt > COOKIE_LIFETIME_MS) showGate()
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
        externalUri = null
        frameSrc = null
        gated = false
        awaitingReturn = false
        lastLoadAt = 0
        if (instructionsEvent) instructionsEvent.dispose()
        if (messageEvent) messageEvent.dispose()
        if (windowStateEvent) windowStateEvent.dispose()
        if (activeEditorEvent) activeEditorEvent.dispose()
        instructionsEvent = null
        messageEvent = null
        windowStateEvent = null
        activeEditorEvent = null
    })

    // make sure instructions are visible and on the side
    reveal()

    return instructionsPanel

}

/**
 * Decide what the webview shows.
 *
 * On the Codespaces web client the forwarded port is private and GitHub only
 * serves it once an auth cookie exists, which its sign-in flow cannot set from
 * inside an iframe. So we show a gate screen: the user opens the IDE in a
 * browser tab (GitHub sets the cookie there) and the iframe loads when they
 * come back. Everywhere else the iframe just loads the url.
 */
async function loadFrame() {
    if (!instructionsPanel) return

    const { config } = lp.config()
    const url = `http://localhost:${config.port}`

    logger.log(`Loading app running on ${url}`)
    const resolved = await vscode.env.asExternalUri(vscode.Uri.parse(url));
    if (!instructionsPanel) return

    externalUri = resolved
    const base = resolved.toString().replace(/\/$/, '')
    frameSrc = `${base}/?config=&nonce=${Date.now()}`
    gated = codespaces.isCodespacesWeb(resolved)

    if (gated) showGate()
    else postLoad()
}

function showGate() {
    awaitingReturn = false
    instructionsPanel.webview.postMessage({ command: 'showGate' })
}

function postLoad() {
    if (!instructionsPanel || !frameSrc) return
    awaitingReturn = false
    lastLoadAt = Date.now()
    instructionsPanel.webview.postMessage({ command: 'load', src: frameSrc })
}

function getWebviewContent() {

    const cspNonce = crypto.randomBytes(16).toString('base64')

    return `
	<!DOCTYPE html>
	<html>
		<head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${cspNonce}'; frame-src https: http:;">
            <style>
                html, body { height: 100%; }
                body {
                    padding: 0; border: 0; margin: 0;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                }
                .iframe-content { display: block; border: 0; margin: 0; width: 100%; height: 100vh; }
                #gate { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
                .gate-card { max-width: 360px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
                .gate-card h1 { margin: 0; font-size: 1.4em; font-weight: 600; line-height: 1.3; }
                .gate-card p { margin: 0; line-height: 1.5; opacity: 0.9; }
                .gate-card button {
                    font: inherit; border: 0; border-radius: 2px; padding: 6px 14px; cursor: pointer;
                }
                .gate-card .primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                .gate-card .primary:hover { background: var(--vscode-button-hoverBackground); }
                .gate-card .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                .gate-card .secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
                .gate-card button:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
                .gate-card .again { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 8px; }
                [hidden] { display: none !important; }
            </style>
		</head>
		<body>
            <div id="gate" hidden>
                <div class="gate-card">
                    <h1>Open the instructions</h1>
                    <button id="open-external" class="primary" type="button">Open in a new tab</button>
                    <p>The instructions will open in a new browser tab.<br>When they finish loading, come back to this tab.</p>
                    <div class="again">
                        <span>Already opened them?</span>
                        <button id="show-frame" class="secondary" type="button">Show them here</button>
                    </div>
                </div>
            </div>

            <iframe
                class="iframe-content"
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups"
                hidden
            ></iframe>

            <script nonce="${cspNonce}">

            const vscode = acquireVsCodeApi();
            const gate = document.getElementById('gate');
            const iframe = document.querySelector('.iframe-content');

            document.getElementById('open-external').addEventListener('click', () => {
                vscode.postMessage({ command: 'openExternal' });
            });
            document.getElementById('show-frame').addEventListener('click', () => {
                vscode.postMessage({ command: 'showFrame' });
            });

            // Handle the message inside the webview
            window.addEventListener('message', event => {

                const message = event.data; // The JSON data our extension sent

                switch (message.command) {
                    case 'showGate':
                        iframe.hidden = true;
                        gate.hidden = false;
                        break;
                    case 'load':
                        gate.hidden = true;
                        iframe.hidden = false;
                        iframe.src = message.src;
                        break;
                    case 'focusContent':
                        try {
                            if (gate.hidden) iframe.focus()
                            else document.getElementById('open-external').focus()
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
