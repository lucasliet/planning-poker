/**
 * Shared application state (single source of truth).
 * All modules read and write through this object.
 */
const State = (() => {
  const FIBONACCI = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
  const RED_SUITS  = new Set(['21', '34', '55', '89', '?', '☕']);

  const data = {
    peer:       null,
    myId:       '',
    myName:     '',
    isHost:     false,
    roomId:     '',
    hostConn:   null,
    guestConns: {},  // { peerId: DataConnection }
    players:    {},  // { peerId: { id, name, vote, isHost } }
    revealed:   false,
    issue:      '',
  };

  return {
    FIBONACCI,
    RED_SUITS,

    get: (key)        => data[key],
    set: (key, value) => { data[key] = value; },

    getPlayer:    (id)         => data.players[id],
    setPlayer:    (id, player) => { data.players[id] = player; },
    removePlayer: (id)         => { delete data.players[id]; },
    getPlayers:   ()           => Object.values(data.players),

    getGuestConn:    (id)       => data.guestConns[id],
    setGuestConn:    (id, conn) => { data.guestConns[id] = conn; },
    removeGuestConn: (id)       => { delete data.guestConns[id]; },
    getGuestConns:   ()         => Object.values(data.guestConns),

    findGuestIdByConn: (conn) =>
      Object.keys(data.guestConns).find((k) => data.guestConns[k] === conn),

    resetRound() {
      data.revealed = false;
      Object.keys(data.players).forEach((id) => {
        data.players[id].vote = null;
      });
    },

    snapshot() {
      return {
        players:  { ...data.players },
        revealed: data.revealed,
        issue:    data.issue,
      };
    },
  };
})();
