const vscode = require("vscode")
const logger = require("../utils/console")

let welcomePanel = null

module.exports = async () => {

    // avoid opening it again
    if(welcomePanel) return welcomePanel;

    // Create and show a new webview
    welcomePanel = vscode.window.createWebviewPanel(
        `${extension.name}-welcome`, // Identifies the type of the webview. Used internally
        `${extension.title} Welcome`, // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            //enableScripts: true,
            preserveFocus: false,
            // localResourceRoots: [vscode.Uri.file(APP_ROOT)]
        } // Webview options. More on these later.
    );

    // And set its HTML content
    welcomePanel.webview.html = await getWebviewContent();
}

async function getWebviewContent() {

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
            No files opened
		</body>
	</html>`
	
}