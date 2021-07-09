const chokidar = require('chokidar');
const fs = require('fs');
const events = require('events');
const logger = require("./utils/logger")

const eventEmitter = new events.EventEmitter();

const _events = {
    START_EXERCISE: "start_exercise",
    INIT: "configuration_loaded"
}

let watcher = null;

let config = null;
let newConfig = null;

const broadcast = (path) => {

    try{
        const content = fs.readFileSync(path);
        newConfig = JSON.parse(content);
        logger.debug("Importing changes in the configuration")

        const _emit = (name, data=null) => {
            logger.debug(`EMIT -> `+name)
            eventEmitter.emit(name, newConfig, data);
        }
        
        if(!config && newConfig) _emit(_events.INIT)
        
        // STOP, there is not configuration
        if(!config) return newConfig

        if(config.currentExercise?.slug != newConfig.currentExercise?.slug) _emit(_events.START_EXERCISE);

        logger.debug(`Updated config`)
        return newConfig;

    }catch(error){
        logger.error(`Impossible to load learnpack configuration file`, error)
    }
}

module.exports = {
    events: _events,
    config: () => newConfig || config,
    on: (eventName, listener) => eventEmitter.on(eventName, listener),
    init: (workspacePath) => {

        logger.debug("Initializing learnpack...")

        const configPath = `${workspacePath}/.learn/config.json`;
    
        if(!watcher){
            logger.debug(`Watching config: ${configPath}`)
            watcher = chokidar.watch(`${configPath}`, {
                persistent: true
            });
        }
        else logger.debug("already watching config.json")
    
        watcher
            .on('add', path => config = broadcast(path))
            .on('change', path => config = broadcast(path))
    },
    currentExercise: () => {
        logger.debug("currentExercise")
        const current = newConfig.exercises.find(e => e.slug == newConfig.currentExercise.slug)
        if(!current) return null;

        return {
            ...current,
            visibleFiles: current.files.filter(f => !f.hidden)
        }
    }
}