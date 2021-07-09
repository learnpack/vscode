
const fs = require('fs');
const vscode = require('vscode');
const logger = require('../utils/logger')
const terminal = require('../utils/terminal')
const lp = require('../learnpack')

module.exports = () => {


}

const startTerminal = async () => {
    const currentTerminal = vscode.window.activeTerminal;
    logger.debug("Active terminal", currentTerminal)
    if(!currentTerminal){
    	logger.debug("Opening a new terminal")
        vscode.window.createTerminal(`Ext Terminal #${NEXT_TERM_ID++}`);
        start()
    }
    else{
        start();
    }
}

const start = async () => {

    try{
        const success = terminal.execShell(`learnpack start`)
        logger.success("started tutorial")
        vscode.window.showInformationMessage('Successfully Started Tutorial');
        return success;
    }
    catch(error){
        logger.error("exited with error", error)
    }
}