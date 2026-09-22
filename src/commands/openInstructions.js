const vscode = require('vscode');
const crypto = require('crypto');
const logger = require('../utils/console')
const lp = require('../learnpack')
const history = require('../utils/history')
const codespaces = require('../utils/codespaces')

let instructionsPanel = null
let instructionsEvent = null
let messageEvent = null

let forcedToActiveEditor = null
let activeEditorEvent = null

// where the IDE is reachable from the user's browser, resolved in loadFrame()
let externalUri = null
let frameSrc = null
// true on the Codespaces web client, where the iframe needs a gate screen
let gated = false
let lastLoadAt = 0

// GitHub's private-port cookie lasts 3 hours; a panel shown again after that
// gets the gate screen back instead of a broken iframe.
const COOKIE_LIFETIME_MS = 3 * 60 * 60 * 1000
// an asset of the IDE the webview can load as an image to check whether
// GitHub already lets requests through to the port
const PROBE_PATH = '/learnpack.svg'

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
            // "Open the instructions in a new tab": GitHub sets its cookie there
            case 'openExternal':
                if (!externalUri) return
                vscode.env.openExternal(externalUri).then(opened => {
                    if (!opened) logger.warn("Could not open the IDE in the browser")
                }, error => logger.warn(`Could not open the IDE in the browser: ${error.message}`))
                break
            // the webview's probe image loaded: GitHub lets requests through now
            case 'cookieReady':
                if (gated) postLoad()
                break
        }
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
        lastLoadAt = 0
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
 * Decide what the webview shows.
 *
 * On the Codespaces web client the forwarded port is private and GitHub only
 * serves it once an auth cookie exists, which its sign-in flow cannot set from
 * inside an iframe. So the webview checks whether GitHub already lets requests
 * through and, if not, shows a gate screen: the user opens the IDE in a
 * browser tab (GitHub sets the cookie there) and the iframe loads as soon as
 * the check succeeds. Everywhere else the iframe just loads the url.
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

// The webview probes first and only shows the gate if the cookie is missing.
function showGate() {
    const base = externalUri.toString().replace(/\/$/, '')
    instructionsPanel.webview.postMessage({ command: 'showGate', probeUrl: `${base}${PROBE_PATH}` })
}

function postLoad() {
    if (!instructionsPanel || !frameSrc) return
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
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${cspNonce}'; img-src https: http:; frame-src https: http:;">
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
                .screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
                .card { max-width: 360px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
                .card p { margin: 0; line-height: 1.5; opacity: 0.9; }
                .card button {
                    font: inherit; border: 0; border-radius: 2px; padding: 6px 14px; cursor: pointer;
                    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
                }
                .card button:hover { background: var(--vscode-button-hoverBackground); }
                .card button:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
                .row { flex-direction: row; align-items: center; gap: 12px; }
                .spinner {
                    flex: none; width: 18px; height: 18px; border-radius: 50%;
                    border: 2px solid var(--vscode-progressBar-background, currentColor);
                    border-right-color: transparent;
                    animation: spin 0.9s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (prefers-reduced-motion: reduce) {
                    .spinner { animation: none; border-right-color: inherit; opacity: 0.6; }
                }
                [hidden] { display: none !important; }
            </style>
		</head>
		<body>
            <div id="gate" class="screen" hidden>
                <div class="card">
                    <button id="open-external" type="button">Open the instructions in a new tab</button>
                    <p>Once the new tab finishes loading, come back here &mdash; you can close it.</p>
                </div>
            </div>

            <div id="waiting" class="screen" hidden>
                <div class="card row" role="status">
                    <span class="spinner" aria-hidden="true"></span>
                    <span>Opening the instructions…</span>
                </div>
            </div>

            <iframe
                class="iframe-content"
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups"
                hidden
            ></iframe>

            <script nonce="${cspNonce}">

            const vscode = acquireVsCodeApi();
            const iframe = document.querySelector('.iframe-content');
            const views = {
                gate: document.getElementById('gate'),
                waiting: document.getElementById('waiting'),
                frame: iframe,
            };
            const openButton = document.getElementById('open-external');

            // one view at a time; null shows nothing (while the first probe runs)
            let view = null;
            const show = (name) => {
                view = name;
                for (const key in views) views[key].hidden = key !== name;
            };

            // We cannot see GitHub's cookie, but we can tell when it works: an image
            // request to the port is not a navigation, so GitHub lets it through once
            // the cookie exists and redirects it to an html sign-in page (which fails
            // as an image) until then. Probe once a second and load the iframe on the
            // first success. Probing starts as soon as the gate is requested, so a
            // panel reopened with the cookie in place never shows the gate at all.
            const PROBE_INTERVAL_MS = 1000;
            const PROBE_WINDOW_MS = 2 * 60 * 1000;
            // after this long on the spinner, offer the button again (the tab may
            // have been blocked or closed before it loaded)
            const WAITING_TIMEOUT_MS = 30 * 1000;
            let probeUrl = null;
            let probeTimer = null;
            let probeUntil = 0;
            let waitingTimer = null;

            const stopProbing = () => {
                if (probeTimer) clearTimeout(probeTimer);
                probeTimer = null;
                probeUntil = 0;
            };
            const stopWaiting = () => {
                if (waitingTimer) clearTimeout(waitingTimer);
                waitingTimer = null;
            };
            const probe = () => {
                probeTimer = null;
                if (!probeUrl || Date.now() > probeUntil) return stopProbing();
                const img = new Image();
                img.onload = () => {
                    stopProbing();
                    stopWaiting();
                    vscode.postMessage({ command: 'cookieReady' });
                };
                img.onerror = () => {
                    // the first failed probe is what reveals the gate
                    if (view === null) show('gate');
                    if (probeUntil) probeTimer = setTimeout(probe, PROBE_INTERVAL_MS);
                };
                img.src = probeUrl + '?probe=' + Date.now();
            };
            const startProbing = (immediately) => {
                stopProbing();
                probeUntil = Date.now() + PROBE_WINDOW_MS;
                probeTimer = setTimeout(probe, immediately ? 0 : PROBE_INTERVAL_MS);
            };

            // if the user took longer than the probe window in the tab, start
            // again when they come back to this browser tab
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && probeUrl && !probeTimer && view !== 'frame') startProbing(true);
            });

            openButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openExternal' });
                show('waiting');
                startProbing(false);
                stopWaiting();
                waitingTimer = setTimeout(() => {
                    waitingTimer = null;
                    if (view === 'waiting') show('gate');
                }, WAITING_TIMEOUT_MS);
            });

            // Handle the message inside the webview
            window.addEventListener('message', event => {

                const message = event.data; // The JSON data our extension sent

                switch (message.command) {
                    case 'showGate':
                        stopWaiting();
                        probeUrl = message.probeUrl;
                        show(null);
                        startProbing(true);
                        break;
                    case 'load':
                        stopProbing();
                        stopWaiting();
                        show('frame');
                        iframe.src = message.src;
                        break;
                    case 'focusContent':
                        try {
                            if (view === 'frame') iframe.focus()
                            else if (view === 'gate') openButton.focus()
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
