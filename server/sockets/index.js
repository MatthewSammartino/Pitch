const lobbySocket = require("./lobbySocket");

module.exports = function registerSockets(io) {
  lobbySocket(io.of("/lobby"));
};
