
const log = () => {

    const log = function(){
        console.log("LOG: ", ...arguments)
    };
    const debug = function(){
        console.log("DEBUG: ", ...arguments)
    };
    const warn = function(){
        console.log("WARN: ", ...arguments)
    };
    const logError = function(){
        console.log("ERROR: ", ...arguments)
    };


    return { log, debug, warn, error: logError }

}

module.exports = log()