const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger')
const lp = require('../learnpack')
const vscode = require('vscode');

module.exports = async () => {

    logger.debug("opening", extension.workspaceRoot)
    const file = vscode.Uri.file(`${extension.workspaceRoot}/README.md`);
    vscode.window.showTextDocument(file, {preview: true, preserveFocus: false}).then(async () => {

        // Create and show a new webview
        const panel = vscode.window.createWebviewPanel(
            extension.name, // Identifies the type of the webview. Used internally
            extension.title, // Title of the panel displayed to the user
            vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
            {
                enableScripts: true,
                preserveFocus: true,
                // localResourceRoots: [vscode.Uri.file(APP_ROOT)]
            } // Webview options. More on these later.
        );
    
        // And set its HTML content
        panel.webview.html = await getWebviewContent();
    })

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