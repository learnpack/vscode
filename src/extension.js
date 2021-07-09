const vscode = require('vscode');
const path = require("path");
const fs = require("fs");
const logger = require('./utils/logger')
const { getWorkspacePath } = require("./utils")
const lp = require("./learnpack")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const workspacePath = getWorkspacePath().wf;
	logger.debug("Activating learnpack extension on "+workspacePath)
	
	global.extension = {
		name: 'learnpack-vscode',
		title: 'LearnPack',
		workspaceRoot: workspacePath,
	}

	logger.debug("Loading extension with config: ", extension);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	loadCommands(context);

	lp.on(lp.events.START_EXERCISE, (data) => {
        logger.debug("Start a new exercise", data)
		vscode.commands.executeCommand(`${extension.name}.openCurrentExercise`)
    })
	
	// load learnpack configuration
	lp.init(workspacePath)
	
	logger.debug(`Congratulations, your extension "${extension.name}" is now active!`);
}

// this method is called when your extension is deactivated
function deactivate() {}

function loadCommands(context){

	const { name } = extension;
	
	// directory path
	const dir = path.resolve(__dirname + '/commands/');

	// list all files in the directory
	try {
		const files = fs.readdirSync(dir);

		// files object contains all files names
		// log them on console
		files.forEach(file => {
			const commandName = `${name}.${file.split(".")[0]}`;
			const commandHandler = require(dir+"/"+file);
			logger.debug(`Loading command ${commandName}`);
			const cmd = vscode.commands.registerCommand(`${commandName}`, commandHandler);
			context.subscriptions.push(cmd);
		});

	} catch (err) {
		console.log(err);
	}
}


module.exports = {
	activate,
	deactivate
}
