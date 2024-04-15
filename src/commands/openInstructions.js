const vscode = require('vscode');
const logger = require('../utils/console')
const lp = require('../learnpack')
const history = require('../utils/history')

let instructionsPanel = null
let instructionsEvent = null

let forcedToActiveEditor = null
let activeEditorEvent = null

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
            retainContextWhenHidden: false,
            // localResourceRoots: [
            //     vscode.Uri.joinPath(extensionUri, 'media')
            // ]
        } // Webview options. More on these later.
    );

    // And set its HTML content
    instructionsPanel.webview.html = await getWebviewContent();

    lp.setInstructionsPanel(instructionsPanel)

    //instructionsEvent = instructionsPanel.onDidChangeViewState(e => reveal())

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
        instructionsEvent.dispose()
        activeEditorEvent.dispose()
    })

    // make sure instructions are visible and on the side
    reveal()

    return instructionsPanel

}

async function getWebviewContent() {

    const { config } = lp.config()
    const appRoot = `${config.dirPath}/_app/`

    const nonce = new Date().getTime() + '' + new Date().getMilliseconds()
    // const publicUrl = config.publicUrl// + ((config.publicUrl.indexOf(":"+config.port) === -1) ? ":"+config.port : "")
    const url = `http://localhost:${config.port}`

    logger.log(`Loading app from ${appRoot} running on ${url}`)
    const learnpackURL = await vscode.env.asExternalUri(vscode.Uri.parse(url));

    const encodedConfig = "";
    // const encodedConfig = Buffer.from(JSON.stringify(learnpack)).toString('base64');
    // logger.log("config", encodedConfig)
    return `
	<!DOCTYPE html>
	<html>
		<head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-type" content="text/htmlcharset=UTF-8">
		</head>
		<body style="padding: 0; border: 0;margin: 0;height: 100vh;">
            <iframe 
                class="iframe-content"
                style="border: 0;margin: 0;height: 100vh;" 
                src="${learnpackURL}?config=${encodedConfig}&nonce=${nonce}" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups"
                width="100%" height="100%"
            ></iframe>

            <script>
    
            // Handle the message inside the webview
            window.addEventListener('message', event => {
    
                const message = event.data; // The JSON data our extension sent
    
                switch (message.command) {
                    // Add this case to the switch statement in your script
                    case 'focusContent':
                        try {
                            const iframe = document.querySelector('.iframe-content');
                            iframe.focus()
                            
                            console.log("Iframe focused!")
                        } catch (error) {
                            console.error('Error focusing content:', error);
                        }
                        break;
                }
            });
        </script>
		</body>
	</html>`

}
