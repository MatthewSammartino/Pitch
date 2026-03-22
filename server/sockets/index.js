const lobbySocket = require("./lobbySocket");
const gameSocket  = require("./gameSocket");

module.exports = function registerSockets(io, socketAuth) {
  const lobbyNsp = io.of("/lobby");
  lobbyNsp.use(socketAuth);
  lobbySocket(lobbyNsp);

  const gameNsp = io.of("/game");
  gameNsp.use(socketAuth);
  gameSocket(gameNsp);
};
