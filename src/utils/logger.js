
module.exports = () => {

    const log = (text) => console.log("LOG: ", text);
    const debug = (text) => console.log("DEBUG: ", text);
    const warn = (text) => console.log("WARN: ", text);
    const logError = (text) => console.log("ERROR: ", text);


    return { log, debug, warn, error: logError }

}