const vscode = require('vscode');
const path = require("path");
const fs = require("fs");
const logger = require('./utils/console')
const { getWorkspacePath, isPortFree } = require("./utils")
const lp = require("./learnpack")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	if(!getWorkspacePath()){
		vscode.window.showInformationMessage("LearnPack didn't start because no files were found on this workspace")
		return;
	}
	const workspacePath = getWorkspacePath().wf.replace(/\/(\w):/, "$1:");
	logger.debug("Activating learnpack extension on "+workspacePath)

	// TODO: load name and title from the package.json
	global.extension = {
		name: 'learnpack-vscode',
		title: 'LearnPack',
		workspaceRoot: workspacePath,
	}

	logger.debug("Loading extension with config: ", extension);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	loadCommands(context);

	/**
	 * Start listening to all learnpack events coming from the learnpack-cli
	 */

	// when a new exercise is loaded on the front-end
	lp.on(lp.events.START_EXERCISE, (data) => {
        logger.debug("Start a new exercise", data)
		vscode.commands.executeCommand(`${extension.name}.openCurrentExercise`)
    })

	// when the CLI finished running the server and socket
	lp.on(lp.events.RUNNING, async (data) => {
		logger.debug("Showing instructions")
		await vscode.commands.executeCommand(`${extension.name}.openInstructions`)
		vscode.window.showInformationMessage(`LearnPack is now running`)
	})

	// when the user wants to see the solution
lp.on(lp.events.OPEN_FILES, async (data) => {
    logger.debug("Trying to open files received in the next line")
    logger.debug(data);
    
    // Loop through the array of files and open each one
    for (const fileName of data) {
        const file = vscode.Uri.file(`${workspacePath}/${fileName}`);
        const editor = await vscode.window.showTextDocument(file, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
            preview: false,
        });
    }
})

	// whenever we want to open a new window
	lp.on(lp.events.OPEN_WINDOW, async (data={}) => {
		const url = (typeof(data) === "string") ? data : data.url
		const schemaUrl = vscode.Uri.parse(url)
		logger.debug("Opening window with: ", schemaUrl)
		vscode.env.openExternal(schemaUrl)
			// .then(data => vscode.window.showInformationMessage(`Learnpack: Opening following url on a new window: ${url}`))
			.catch(error => vscode.window.showErrorMessage(`Error opening window with: ${url}`))
	})

	// load learnpack, required to start listening to the events above.
	lp.init(workspacePath)
		.then(async ({ config }) => {
			const free = await isPortFree(config.port)
			logger.debug(`Port ${config.port} is free=${free}`)
			if(lp.autoPlay()){
				if(free) await vscode.commands.executeCommand(`${extension.name}.openTerminal`)
				else await vscode.commands.executeCommand(`${extension.name}.openInstructions`)
			}
		})
		.catch(error => {
			vscode.window.showErrorMessage(error.message || error.msg || error)
		})

	logger.debug(`Congratulations, your extension "${extension.name}" is now active and waiting for LearnPack to start!`);
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
