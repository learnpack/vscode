const vscode = require('vscode');
const markdownPreviewFirst = require("./features/markdown_preview_first")
const learnpackPreview = require("./features/learnpack_preview")
const logger = require('./utils/logger')
const { getWorkspacePath, execShellCommand } = require("./utils")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let config = {
		context,
		vscode,
		workspaceRoot: getWorkspacePath().wf,
		appRoot: `${getWorkspacePath().wf}/.learn/_app/`
	}
	logger.debug("config", config)
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "learnpack-vsplugin" is now active!');

	learnpackPreview(config);	
	// markdownPreviewFirst(config);	

}

// this method is called when your extension is deactivated
function deactivate() {}


module.exports = {
	activate,
	deactivate
}
