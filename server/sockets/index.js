const lobbySocket = require("./lobbySocket");
const gameSocket  = require("./gameSocket");

module.exports = function registerSockets(io) {
  lobbySocket(io.of("/lobby"));
  gameSocket(io.of("/game"));
};
