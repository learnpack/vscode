const vscode = require('vscode');
const lp = require('../learnpack');
const logger = require('../utils/console')
const history = require('../utils/history')


module.exports = async () => {
    logger.debug("open current")
    
    let current = lp.currentExercise()
    
    // history.closeAllOpened()
    
    logger.debug(`Opening ${current.slug}`, current)
    return openFiles(current)
    
}

const openFiles = async (ex) => {
    const files = ex.visibleFiles;
    logger.debug(`Files to open`, files)
    let editor = null
    for(let i = 0; i < files.length; i++){
        const file = vscode.Uri.file(`${extension.workspaceRoot}/${files[i].path}`);
        editor = await vscode.window.showTextDocument(file, vscode.ViewColumn.One)
    }
    return editor;
}