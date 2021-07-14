const vscode = require('vscode');
const logger = require('../utils/console')
const lp = require('../learnpack')
const history = require('../utils/history')

let instructionsPanel = null
let instructionsEvent = null

const reveal = () => {
    logger.debug(`Instructions currently on view ${instructionsPanel.viewColumn}`)

    // if(instructionsPanel.visible && instructionsPanel.viewColumn != vscode.ViewColumn.Two){
    //     logger.debug(`Moving instructions to the side`)
    //     vscode.commands.executeCommand(`workbench.action.splitEditor`)
    // }
    
    if(!instructionsPanel.visible){
        logger.debug(`Revealing instructions`)
        instructionsPanel.reveal(vscode.ViewColumn.Two)
    } 

    return instructionsPanel
}
module.exports = async () => {

    logger.debug("opening", extension.workspaceRoot)
    if(history.noOpenedFies()) await vscode.commands.executeCommand(`${extension.name}.openWelcome`)
    
    if(instructionsPanel) return reveal()

    // Create and show a new webview
    instructionsPanel = vscode.window.createWebviewPanel(
        `${extension.name}-instructions`, // Identifies the type of the webview. Used internally
        `${extension.title} Instructions`, // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
        {
            enableScripts: true,
            preserveFocus: false,
            // localResourceRoots: [vscode.Uri.file(APP_ROOT)]
        } // Webview options. More on these later.
    );

    // And set its HTML content
    instructionsPanel.webview.html = await getWebviewContent();

    lp.setInstructionsPanel(instructionsPanel)

    instructionsEvent = instructionsPanel.onDidChangeViewState(e => reveal())

    // console.log("visible editors", vscode.window.visibleTextEditors())

    instructionsPanel.onDidDispose(() => {
        instructionsPanel = null
        instructionsEvent.dispose()
    })

    // make sure instructions are visible and on the side
    reveal()

    return instructionsPanel

}

async function getWebviewContent() {

    const { config } = lp.config()
    const appRoot = `${config.dirPath}/_app/`

	logger.log("Loading app from ",appRoot)

    const learnpackURL = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${config.address}:${config.port}`)
    );

    const encodedConfig = {};
    // const encodedConfig = Buffer.from(JSON.stringify(learnpack)).toString('base64');
    // logger.log("config", encodedConfig)
	return `
	<!DOCTYPE html>
	<html>
		<head>
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta charset="UTF-8">
			<title>LearnPack Exercise Engine by @alesanchezr</title>
			<link rel="shortcut icon" href="icon.ico">
            <script>
                window.onload = function(){
                    let app = document.querySelector('iframe');
                    console.log("app", app)
                    console.log("iframe window", app.contentWindow)
                }
            </script>
		</head>
		<body style="padding: 0;">
            <iframe 
                style="border: 0; height: 100vh;" 
                src="${learnpackURL}?config=${encodedConfig}" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups"
                width="100%" height="100%"
            ></iframe>
		</body>
	</html>`
	
}