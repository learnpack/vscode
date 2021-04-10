// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getWorkspacePath, execShellCommand } = require("./utils")
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const WORKSPACE_ROOT = getWorkspacePath().wf
	const APP_ROOT = `${WORKSPACE_ROOT}/.learn/_app`
	console.log("WORKSPACE_ROOT", WORKSPACE_ROOT)

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "learnpack-vsplugin" is now active!');

	

	
	context.subscriptions.push(
		vscode.commands.registerCommand('learnpack-vsplugin.start', () => {

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
			panel.webview.html = getWebviewContent(APP_ROOT);
		})
	);
}

// this method is called when your extension is deactivated
function deactivate() {}

function getWebviewContent(appPath) {
	let configJson = {
		host: ""//here is where I want to specify the host on the window object to pass it to the react application
	};
	console.log("getwebview", path.join(appPath, "bundle.js"))
    const reactAppPathOnDisk = vscode.Uri.file(
		path.join(appPath, "bundle.js")
	  );
	const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });

	return `
	<!DOCTYPE html>
	<html>
		<head>
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta charset="UTF-8">
			<title>LearnPack Exercise Engine by @alesanchezr</title>
			<link rel="shortcut icon" href="icon.ico">
			<script>
				window.acquireVsCodeApi = acquireVsCodeApi;
				window.vscodeConfig = ${configJson};
		  </script>
		</head>
		<body>
			<div id="app"></div>
			<script type="text/javascript" src="${reactAppUri}"></script>
		</body>
	</html>
	
	`;
  }

module.exports = {
	activate,
	deactivate
}
