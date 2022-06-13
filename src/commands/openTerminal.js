
const fs = require('fs');
const vscode = require('vscode');
const logger = require('../utils/console')
const lp = require('../learnpack')

let terminal = null
const TERMINAL_NAME = `LearnPack Terminal`
module.exports = () => {
    const extConfig = vscode.workspace.getConfiguration()
	const learnpackCommand = extConfig.get('learnpack.terminalEntryCommand');
    // make sure there is  only one learnpack terminal

    if(!terminal && vscode.window.activeTerminal && vscode.window.activeTerminal.name === TERMINAL_NAME){
        terminal = vscode.window.activeTerminal
    }

    if(!terminal){
        logger.debug(`Opening new terminal`)
        terminal = vscode.window.createTerminal(TERMINAL_NAME);
        vscode.window.onDidCloseTerminal(t => {
            logger.debug(`Terminal closed`)
            // ignore closing other terminals, only learnpack terminal matters
            if(terminal.processId !== t.processId) return;
            
            vscode.window.showInformationMessage(`LearnPack terminal closed`);
            terminal = null
        });
    } else logger.debug(`Terminal already opened in process ${terminal.processId}`)
    
    terminal.show(true); // true = don't take focus when opening
    if(!lp.config().currentExercise){
        logger.debug(`Running LearnPack from the terminal: ${learnpackCommand}`)
        terminal.sendText(learnpackCommand);
    }
    else logger.debug(`LearnPack is already running, no need to start from the terminal`)

}