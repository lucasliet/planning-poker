/**
 * PeerJS networking layer.
 * Handles peer creation, connection management and message routing.
 */
const PeerManager = (() => {
  const PEER_CONFIG = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    },
  };

  const PEER_PREFIX = 'ppk-';

  const PEER_TIMEOUT_MS = 15_000;

  /** Creates a Peer and resolves when the connection is open. */
  function initPeer(id) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const p = new Peer(id, PEER_CONFIG);

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        p.destroy();
        reject(new Error('Tempo esgotado ao conectar ao servidor de sinalização.'));
      }, PEER_TIMEOUT_MS);

      p.on('open', (assignedId) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        State.set('peer', p);
        State.set('myId', assignedId);
        resolve(p);
      });

      p.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        p.destroy();
        reject(err);
      });
    });
  }

  // ── Host ────────────────────────────────────────────────────

  /** Creates a room as host with a given roomId. */
  async function createRoom(roomId) {
    await initPeer(PEER_PREFIX + roomId);
    const peer = State.get('peer');
    peer.on('connection', onIncomingConnection);
  }

  /** Called when a guest connects to the host. */
  function onIncomingConnection(conn) {
    conn.on('open', () => {
      // Guest sends a 'join' message immediately on open
    });

    conn.on('data', (msg) => handleGuestMessage(conn, msg));

    conn.on('close', () => {
      const guestId = State.findGuestIdByConn(conn);
      if (!guestId) return;

      const name = State.getPlayer(guestId)?.name ?? 'Alguém';
      State.removeGuestConn(guestId);
      State.removePlayer(guestId);

      UI.toast(`${name} saiu da sala.`);
      UI.renderPlayers();
      UI.updateVoteCount();
      UI.updateRevealBtn();
      broadcastState();
    });
  }

  /** Processes a message sent from a guest to the host. */
  function handleGuestMessage(conn, msg) {
    switch (msg.type) {
      case 'join': {
        const guestId = msg.id;
        State.setGuestConn(guestId, conn);
        State.setPlayer(guestId, { id: guestId, name: msg.name, vote: null, isHost: false });
        UI.toast(`${msg.name} entrou na sala!`);
        broadcastState();
        UI.renderPlayers();
        UI.updateVoteCount();
        UI.updateRevealBtn();
        break;
      }
      case 'vote': {
        const guestId = State.findGuestIdByConn(conn) ?? msg.id;
        const player = State.getPlayer(guestId);
        if (player) player.vote = msg.vote;
        broadcastState();
        UI.renderPlayers();
        UI.updateVoteCount();
        UI.updateRevealBtn();
        break;
      }
      case 'issue': {
        State.set('issue', msg.issue);
        document.getElementById('issueInput').value = msg.issue;
        broadcastState();
        break;
      }
    }
  }

  // ── Guest ────────────────────────────────────────────────────

  /** Joins a room by connecting to the host peer. */
  async function joinRoom(roomId) {
    await initPeer(undefined);
    const peer   = State.get('peer');
    const myId   = State.get('myId');
    const myName = State.get('myName');

    return new Promise((resolve, reject) => {
      const conn = peer.connect(PEER_PREFIX + roomId, { metadata: { name: myName, id: myId } });
      State.set('hostConn', conn);

      const timeout = setTimeout(() => {
        if (!conn.open) reject(new Error('Sala não encontrada ou host offline.'));
      }, 7000);

      conn.on('open', () => {
        clearTimeout(timeout);
        send(conn, { type: 'join', name: myName, id: myId });
        resolve();
      });

      conn.on('data', handleHostMessage);

      conn.on('close', () => {
        UI.toast('Desconectado da sala.');
        UI.setConnStatus('offline');
      });

      conn.on('error', (err) => reject(err));
    });
  }

  /** Processes a message sent from the host to a guest. */
  function handleHostMessage(msg) {
    switch (msg.type) {
      case 'state': {
        State.set('players',  msg.players);
        State.set('revealed', msg.revealed);
        State.set('issue',    msg.issue ?? '');
        document.getElementById('issueInput').value = msg.issue ?? '';
        UI.renderPlayers();
        UI.updateVoteCount();
        UI.updateRevealBtn();
        if (msg.revealed) UI.showResults();
        break;
      }
      case 'newRound': {
        State.set('players',  msg.players);
        State.set('revealed', false);
        State.set('myVote',   null);
        State.set('issue',    msg.issue ?? '');
        document.getElementById('issueInput').value = msg.issue ?? '';
        document.getElementById('resultsArea').hidden = true;
        UI.renderPlayers();
        UI.renderHand();
        UI.updateVoteCount();
        UI.updateRevealBtn();
        break;
      }
    }
  }

  // ── Messaging helpers ────────────────────────────────────────

  /** Safely sends a message through a DataConnection. */
  function send(conn, msg) {
    try {
      if (conn?.open) conn.send(msg);
    } catch (e) {
      console.error('PeerManager.send error:', e);
    }
  }

  /** Broadcasts state to all connected guests (host only). */
  function broadcastState() {
    if (!State.get('isHost')) return;
    const msg = { type: 'state', ...State.snapshot() };
    State.getGuestConns().forEach((conn) => send(conn, msg));
  }

  /** Sends the current issue to host (guest only). */
  function sendIssue(issue) {
    send(State.get('hostConn'), { type: 'issue', issue });
  }

  /** Sends a vote to host (guest only). */
  function sendVote(vote) {
    send(State.get('hostConn'), { type: 'vote', vote, id: State.get('myId') });
  }

  /** Broadcasts a newRound event to all guests (host only). */
  function broadcastNewRound() {
    const msg = { type: 'newRound', ...State.snapshot() };
    State.getGuestConns().forEach((conn) => send(conn, msg));
  }

  return {
    createRoom,
    joinRoom,
    broadcastState,
    broadcastNewRound,
    sendIssue,
    sendVote,
  };
})();
