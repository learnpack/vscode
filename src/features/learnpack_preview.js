const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger')

module.exports = ({ context, vscode, appRoot }) => {

    context.subscriptions.push(
        vscode.commands.registerCommand('learnpack-vsplugin.start', () => {

            logger.log("Starting webview")
            // const currentTerminal = vscode.window.activeTerminal
            // console.log("Active terminal", currentTerminal)
            // if(!currentTerminal){
            // 	console.log("Opening a new terminal")
            // 	context.subscriptions.push(vscode.commands.registerCommand('terminalTest.createTerminal', () => {
            // 		vscode.window.createTerminal(`Ext Terminal #${NEXT_TERM_ID++}`);
            // 		vscode.window.showInformationMessage('Hello World 2!');
            // 	}));
            // }

            // execShellCommand(`learnpack start`, WORKSPACE_ROOT)
            // 	.then(success => {
            // 		console.log("started tutorial")
            // 	})
            // 	.catch(error => {
            // 		console.log("exited with error", error)
            // 	})
            
            // Create and show a new webview
            const panel = vscode.window.createWebviewPanel(
                'learnpack-vsplugin', // Identifies the type of the webview. Used internally
                'LearnPack', // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    enableScripts: true,
                    // localResourceRoots: [vscode.Uri.file(APP_ROOT)]
                } // Webview options. More on these later.
            );

            // And set its HTML content
            panel.webview.html = getWebviewContent(vscode, appRoot);
        })
    );

}

function getWebviewContent(vscode, appRoot) {
	let configJson = {
		host: "http://localhost:3000"//here is where I want to specify the host on the window object to pass it to the react application
	};

	logger.log("Loading app from ",appRoot)

    const reactAppPathOnDisk = vscode.Uri.file(
		path.join(appRoot, "bundle.js")
	);
	const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });
    logger.log("reactAppUri",reactAppUri)

	return `
	<!DOCTYPE html>
	<html>
		<head>
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta charset="UTF-8">
			<title>LearnPack Exercise Engine by @alesanchezr</title>
			<link rel="shortcut icon" href="icon.ico">
		</head>
		<body style="padding: 0;">
            <iframe style="border: 0; height: 100vh;" src="${configJson.host}" width="100%" height="100%"></iframe>
		</body>
	</html>`
	
}

// function getWebviewContent(vscode, appRoot) {
// 	let configJson = {
// 		host: "http://localhost:3000"//here is where I want to specify the host on the window object to pass it to the react application
// 	};

// 	logger.log("Loading app from ",appRoot)

//     const reactAppPathOnDisk = vscode.Uri.file(
// 		path.join(appRoot, "bundle.js")
// 	);
// 	const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });
//     logger.log("reactAppUri",reactAppUri)

// 	return `
// 	<!DOCTYPE html>
// 	<html>
// 		<head>
// 			<meta name="viewport" content="width=device-width, initial-scale=1.0">
// 			<meta charset="UTF-8">
// 			<title>LearnPack Exercise Engine by @alesanchezr</title>
// 			<link rel="shortcut icon" href="icon.ico">
// 			<script>
// 				window.acquireVsCodeApi = acquireVsCodeApi;
// 				window.learnpackConfig = ${JSON.stringify(configJson)};
// 		  </script>
// 		</head>
// 		<body>
// 			<div id="app"></div>
// 			<script type="text/javascript" src="${reactAppUri}"></script>
// 		</body>
// 	</html>`
	
// }