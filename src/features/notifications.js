const logger = require("../utils/console")
const Socket = require("../utils/socket")

module.exports = ({ learnpack }) => {

    Socket.start(`${learnpack.address}:${learnpack.port}`, () => { // <-- On Disconnect Callback!
        logger.error("Disconected from host")
    });

    const compilerSocket = Socket.createScope('compiler');
    compilerSocket.whenUpdated((scope, data) => {
        logger.log("socket notification", data)
    });

}