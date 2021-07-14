const vscode = require('vscode');
const lp = require('../learnpack');
const logger = require('../utils/console')

module.exports = async () => {
    logger.debug("video solution")
    let current = lp.currentExercise()
    logger.debug("current", current)
    const readme = current.instructions()
    logger.debug("readme", readme)
    if(readme.attributes.tutorial){
        const url = vscode.Uri.parse(readme.attributes.tutorial)
        vscode.env.openExternal(url);
    }
    else{
        logger.error(`Current exercise ${current.title} has no tutorial`)
        vscode.window.showErrorMessage(`Current exercise ${current.title} has no tutorial`)
    }

}