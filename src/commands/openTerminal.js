
const fs = require('fs');
const vscode = require('vscode');
const logger = require('../utils/console')
const lp = require('../learnpack')

let terminal = null
module.exports = () => {
    
    if(!terminal){
        logger.debug(`Opening new terminal`)
        terminal = vscode.window.createTerminal(`Learnpack Terminal`);
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
        logger.debug(`Running learnpack from the terminal`)
        terminal.sendText(`learnpack start`);
    }
    else logger.debug(`Learnpack is already running, no need to start from the terminal`)

}