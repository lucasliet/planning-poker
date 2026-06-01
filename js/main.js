/**
 * Main entry point.
 * Wires up event listeners and orchestrates host/guest flows.
 */
(() => {
  function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // ── Create room (host) ─────────────────────────────────────

  async function createRoom() {
    const name = document.getElementById('hostName').value.trim();
    if (!name) { UI.toast('Digite seu nome!'); return; }

    UI.setError('hostError', '');
    UI.setConnStatus('connecting');

    const roomId = generateRoomId();
    State.set('myName',  name);
    State.set('isHost',  true);
    State.set('roomId',  roomId);
    State.set('myVote',  null);

    try {
      await PeerManager.createRoom(roomId);
      const myId = State.get('myId');
      State.setPlayer(myId, { id: myId, name, vote: null, isHost: true });
      UI.setConnStatus('online');
      UI.showRoom();
    } catch (err) {
      UI.setConnStatus('offline');
      UI.setError('hostError', `Erro ao criar sala: ${err.message}`);
    }
  }

  // ── Join room (guest) ──────────────────────────────────────

  async function joinRoom() {
    const name = document.getElementById('guestName').value.trim();
    const code = document.getElementById('roomCode').value.trim().toUpperCase();

    if (!name) { UI.toast('Digite seu nome!'); return; }
    if (!code) { UI.toast('Digite o código da sala!'); return; }

    UI.setError('joinError', '');
    UI.setConnStatus('connecting');

    State.set('myName',  name);
    State.set('isHost',  false);
    State.set('roomId',  code);
    State.set('myVote',  null);

    try {
      await PeerManager.joinRoom(code);
      const myId = State.get('myId');
      State.setPlayer(myId, { id: myId, name, vote: null, isHost: false });
      UI.setConnStatus('online');
      UI.showRoom();
    } catch (err) {
      UI.setConnStatus('offline');
      UI.setError('joinError', err.message);
    }
  }

  // ── Reveal votes ───────────────────────────────────────────

  function revealVotes() {
    if (!State.get('isHost')) return;
    State.set('revealed', true);
    PeerManager.broadcastState();
    UI.renderPlayers();
    UI.showResults();
  }

  // ── New round ──────────────────────────────────────────────

  function newRound() {
    if (!State.get('isHost')) return;
    State.resetRound();
    State.set('myVote', null);
    document.getElementById('resultsArea').hidden = true;
    PeerManager.broadcastNewRound();
    UI.renderPlayers();
    UI.renderHand();
    UI.updateVoteCount();
    UI.updateRevealBtn();
  }

  // ── Issue sync ─────────────────────────────────────────────

  function onIssueInput(e) {
    const issue = e.target.value;
    State.set('issue', issue);
    if (State.get('isHost')) {
      PeerManager.broadcastState();
    } else {
      PeerManager.sendIssue(issue);
    }
  }

  // ── Keyboard shortcuts ─────────────────────────────────────

  function onKeydown(e) {
    const inInput = document.activeElement?.tagName === 'INPUT';
    if (inInput) return;
    if (e.key === 'r' && State.get('isHost')) revealVotes();
    if (e.key === 'n' && State.get('isHost')) newRound();
  }

  // ── Boot ───────────────────────────────────────────────────

  function init() {
    UI.applyUrlRoom();

    document.getElementById('btnCreate').addEventListener('click', createRoom);
    document.getElementById('btnJoin').addEventListener('click', joinRoom);
    document.getElementById('btnReveal').addEventListener('click', revealVotes);
    document.getElementById('btnNewRound').addEventListener('click', newRound);
    document.getElementById('issueInput').addEventListener('input', onIssueInput);
    document.getElementById('btnCopyLink').addEventListener('click', UI.copyRoomLink);
    document.getElementById('shareLink').addEventListener('click', UI.copyRoomLink);

    // Enter key on lobby inputs
    document.getElementById('hostName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createRoom();
    });
    ['guestName', 'roomCode'].forEach((id) => {
      document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinRoom();
      });
    });

    document.addEventListener('keydown', onKeydown);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
