const vscode = require('vscode');
const lp = require('../learnpack');
const logger = require('../utils/logger')

let history = []

module.exports = async () => {
    logger.debug("open current")
    
    let latest = history.length > 0 ? history[history.length - 1] : null
    let current = lp.currentExercise()
    
    if(latest && latest?.slug === current.slug) latest = null;
    else logger.debug(`No latest exercise in the history`)
    
    if(latest){
        logger.debug(`Closing latest`, latest)
        closeFiles(latest)
    }

    logger.debug(`Opening ${current.slug}`, current)
    return openFiles(current)
    
}

const closeFiles = async (ex) => {
    const files = ex.visibleFiles;
    for(let i = 0; i < files.length; i++){
        const file = vscode.Uri.file(`${extension.workspaceRoot}/${files[i].path}`);
        await vscode.window.showTextDocument(file, {preview: false, preserveFocus: false})
        return vscode.commands.executeCommand('workbench.action.closeActiveEditor')
    }
}

const openFiles = async (ex) => {
    // logger.debug(`Files to open`, files)
    const files = ex.visibleFiles;
    let editor = null
    for(let i = 0; i < files.length; i++){
        const file = vscode.Uri.file(`${extension.workspaceRoot}/${files[i].path}`);
        editor = await vscode.window.showTextDocument(file, vscode.ViewColumn.One)
    }
    history.push(ex)
    return editor;
}