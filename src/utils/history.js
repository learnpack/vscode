const vscode = require("vscode")
const logger = require("./console")
const path = require("path")

var history = null
var openedFiles = []

const isIgnored = (_path) => {
    const extension = path.extname(_path)
    // ignore files iwth .git extension
    if(extension == ".git"){
        logger.debug(`Ignoring ${_path}`)
        return true;
    }
    
    return false;
}

const _history = () => {

    return {
        get: () => history,
        start: function(){

            // start the history object, the beginning of time
            if(!history){
                history = []
                logger.debug("History innitialized", history)
            }
            else logger.warn("History alreay started")

            // vscode.workspace.onDidOpenTextDocument((e) => {
            // //     logger.debug("Visible editors", vscode.window.visibleTextEditors)
            // //     logger.debug(`File opened: ${e.fileName}`, e)
                
            // //     if(isIgnored(e.fileName)) return;
                
            // //     // concat instead of push to create new space on RAM memory and the previous history will remain intact.
            // //     history.push(e.fileName)
        
            //     openedFiles.push(position,1)
            // })
            
            // vscode.workspace.onDidCloseTextDocument((e) => {
            // //     logger.debug(`File closed: ${e.fileName}`)
                
            // //     if(isIgnored(path)) return;
                
            //     let position = openedFiles.indexOf(f => f === e.fileName)
            //     openedFiles.splice(position,1)
        
            // //     if(openedFiles.length == 0) vscode.commands.executeCommand(`${extension.name}.openWelcome`)
            // })
        },
        noOpenedFies: async () => {
            logger.debug(`Visible editors`, vscode.window.visibleTextEditors.length == 0)
            return (vscode.window.visibleTextEditors.length == 0)
        },
        closeAllOpened: async () => {
            // const opened = vscode.window.visibleTextEditors
            // logger.debug(`There are ${opened.length} opened files`, opened)
            // opened.forEach(te => vscode.commands.executeCommand("workbench.action.closeActiveEditor"))

        }
    }
}

module.exports = _history()