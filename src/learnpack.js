const chokidar = require('chokidar');
const fs = require('fs');
const em = require('events');
const vscode = require('vscode');
const frontMatter = require("front-matter");
const logger = require("./utils/console")
const queue = require("./utils/fileQueue");
const { config } = require('shelljs');
const eventEmitter = new em.EventEmitter();
const { createLearnFolder } = require("./utils");

let listener = null;
let configFile = null;
let autoPlay = null;
let instructionsPanel = null;

const callbacks = {
    [queue.events.RUNNING]: () => {
        const content = fs.readFileSync(`${extension.workspaceRoot}/.learn/config.json`);
        const learnContent = fs.readFileSync(`${extension.workspaceRoot}/learn.json`);
        
        autoPlay = JSON.parse(learnContent).autoPlay;
        configFile = JSON.parse(content);
        
        logger.debug(`Updating configuration`, configFile)
        
        if(configFile.config.grading === "isolated"){
            logger.debug(`Enabling autosave because grading is ${configFile.config.grading}`)
            // enabling autosave
            const config = vscode.workspace.getConfiguration()
            config.update('files.autoSave', "afterDelay")
            config.update('files.autoSaveDelay', 700)
            config.update('editor.minimap.enabled', false)
        }

    },
    [queue.events.START_EXERCISE]: (slug) => {
        configFile.currentExercise = slug
    },
    [queue.events.END]: (slug) => {
        configFile.currentExercise = null
    }
}

const _emit = (name, data=null) => {
    logger.debug(`EMIT -> ${name}`)
    if(callbacks[name]) callbacks[name](data)
    eventEmitter.emit(name, data);
}

/**
 * 
 * This is very early in the lifecycle, the configFile is empty if its the first time running
 * the exercise so we have to create ourselves.
 */
const init = async () => {
    
    if(!fs.existsSync(`${extension.workspaceRoot}/.learn`) && !fs.existsSync(`${extension.workspaceRoot}/learn.json`)){
        throw Error("No LearnPack package was found on this workspace, make sure you have a learn.json file or at least a ./learn folder on your root")
    }
    /**
     *  Very early (before learnpack server starts, make have sure the editor.agent is vscode
     * that way when the server starts it doesn't open a separate window
     * */ 
    if(!fs.existsSync(`${extension.workspaceRoot}/.learn/config.json`)){
        const learnContent = fs.readFileSync(`${extension.workspaceRoot}/learn.json`);
        autoPlay = JSON.parse(learnContent).autoPlay;

        configFile = {
            config: {
                editor: {
                    agent: "vscode"
                },
                autoPlay: autoPlay
            },
            currentExercise: null,
        }
        createLearnFolder();
        fs.writeFileSync(`${extension.workspaceRoot}/.learn/config.json`, JSON.stringify(configFile, null, 2));
    }else{
        const learnContent = fs.readFileSync(`${extension.workspaceRoot}/learn.json`);
        autoPlay = JSON.parse(learnContent).autoPlay;
        configFile = JSON.parse(fs.readFileSync(`${extension.workspaceRoot}/.learn/config.json`))
        logger.debug("First time loading configuration file", configFile)
    }

    if(configFile.config.editor.agent != "vscode"){
        configFile.config.editor.agent = "vscode"
        fs.writeFileSync(`${extension.workspaceRoot}/.learn/config.json`, JSON.stringify(configFile, null, 2));
    }

    // start pulling from the queue (only if we haven't already)
    if(!listener){
        listener = queue.listener({ path: `${extension.workspaceRoot}/${configFile.config.dirPath || ".learn"}/vscode_queue.json` })
        listener.onPull((e) => _emit(e.name, e.data))
        listener.onReset((e) => _emit(e.name, e.data))
    }

    return configFile;
}

module.exports = {
    init, 
    events: queue.events,
    config: () => configFile,
    autoPlay: () => autoPlay,
    on: (eventName, listener) => eventEmitter.on(eventName, listener),
    currentExercise: () => {
        logger.debug("curent is ", configFile.currentExercise)
        const current = configFile.exercises.find(e => e.slug == configFile.currentExercise)
        if(!current) return null;
        
        return {
            ...current,
            visibleFiles: current.files.filter(f => !f.hidden),
            instructions: (lang='us') => {
                const readme = current.files.find(f => f.name.toLowerCase() === "readme.md")
                const content = fs.readFileSync(`${extension.workspaceRoot}/${readme.path}`, 'utf-8');
                logger.debug(`Fetching file instructions in ${extension.workspaceRoot}/${readme.path}`)
                const attr = frontMatter(content)
                return attr;
            }
        }
    },
    setInstructionsPanel: (panel) => {
        instructionsPanel = panel
        instructionsPanel.onDidDispose(() => {
            instructionsPanel = null
            _emit(queue.events.INSTRUCTIONS_CLOSED)
        })
    }
}