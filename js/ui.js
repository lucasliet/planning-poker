/**
 * UI module — all DOM rendering and interaction lives here.
 */
const UI = (() => {
  let toastTimer = null;

  // ── Utils ──────────────────────────────────────────────────

  function toast(msg, duration = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  function setConnStatus(state) {
    const dot = document.getElementById('connDot');
    const lbl = document.getElementById('connLabel');
    dot.className = `dot ${state}`;
    lbl.textContent =
      state === 'online'     ? 'Conectado'   :
      state === 'connecting' ? 'Conectando…' : 'Offline';
  }

  function setError(id, msg) {
    document.getElementById(id).textContent = msg;
  }

  function getInitials(name) {
    return name
      .split(' ')
      .map((w) => w[0] ?? '')
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  function buildRoomLink(roomId) {
    const url = new URL(window.location.href);
    url.hash   = '';
    url.search = '';
    url.searchParams.set('room', roomId);
    return url.toString();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // ── Lobby ──────────────────────────────────────────────────

  /** Pre-fills the join form from URL ?room= param. */
  function applyUrlRoom() {
    const params = new URLSearchParams(window.location.search);
    const room   = params.get('room');
    if (room) {
      document.getElementById('roomCode').value = room.toUpperCase();
      document.getElementById('guestName').focus();
    }
  }

  // ── Room ───────────────────────────────────────────────────

  function showRoom() {
    document.getElementById('lobby').hidden = true;
    const room = document.getElementById('room');
    room.hidden = false;

    const roomId  = State.get('roomId');
    const myName  = State.get('myName');
    const isHost  = State.get('isHost');
    const link    = buildRoomLink(roomId);

    document.getElementById('roomSession').textContent =
      `Sala: ${roomId}  ·  Você: ${myName}`;

    const shareEl = document.getElementById('shareLink');
    shareEl.textContent = link;

    document.getElementById('roleBadge').textContent = isHost ? '♠ HOST' : '♣ PLAYER';

    if (!isHost) {
      document.getElementById('btnNewRound').hidden = true;
      document.getElementById('btnReveal').hidden   = true;
      document.getElementById('issueInput').readOnly = true;
    }

    renderHand();
    renderPlayers();
    updateVoteCount();
  }

  // ── Players ────────────────────────────────────────────────

  function renderPlayers() {
    const grid    = document.getElementById('playersGrid');
    const players = State.getPlayers();
    const myId    = State.get('myId');
    const revealed = State.get('revealed');

    grid.innerHTML = '';

    if (!players.length) {
      grid.innerHTML = '<div class="empty-state">Nenhum participante ainda.</div>';
      return;
    }

    players.forEach((p, i) => {
      const voted    = p.vote != null;
      const isMe     = p.id === myId;
      const isRed    = voted && revealed && State.RED_SUITS.has(p.vote);

      const chip = document.createElement('div');
      chip.className = 'player-chip anim-fade-slide';
      chip.setAttribute('role', 'listitem');
      chip.style.animationDelay = `${i * 40}ms`;

      // Card display
      let cardHtml;
      if (revealed && voted) {
        cardHtml = `<div class="player-card revealed${isRed ? ' suit-red' : ''}">${p.vote}</div>`;
      } else if (voted) {
        cardHtml = `<div class="player-card hidden" aria-label="Voto enviado"></div>`;
      } else {
        cardHtml = `<div class="player-card empty" aria-label="Aguardando voto">·</div>`;
      }

      chip.innerHTML = `
        <div class="player-avatar${p.isHost ? ' is-host' : ''}" aria-hidden="true">
          ${getInitials(p.name)}
          <div class="vote-indicator${voted ? ' voted' : ''}" aria-hidden="true">✓</div>
        </div>
        ${cardHtml}
        <div class="player-name${isMe ? ' is-me' : ''}">
          ${p.name}${isMe ? ' (você)' : ''}${p.isHost ? ' ♠' : ''}
        </div>
      `;

      grid.appendChild(chip);
    });
  }

  // ── Vote counter ───────────────────────────────────────────

  function updateVoteCount() {
    const players = State.getPlayers();
    const voted   = players.filter((p) => p.vote != null).length;
    const total   = players.length;

    document.getElementById('voteCount').textContent   = `${voted} / ${total}`;
    document.getElementById('voteStatus').textContent  =
      voted === total && total > 0 ? 'Todos votaram! ✓'    :
      voted === 0                  ? 'Aguardando votos…'   :
                                     `${voted} de ${total} votou`;
  }

  function updateRevealBtn() {
    if (!State.get('isHost')) return;
    const hasVotes = State.getPlayers().some((p) => p.vote != null);
    document.getElementById('btnReveal').disabled = !hasVotes;
  }

  // ── Results ────────────────────────────────────────────────

  function showResults() {
    const area    = document.getElementById('resultsArea');
    area.hidden   = false;

    const numeric = State.getPlayers()
      .map((p) => parseFloat(p.vote))
      .filter((v) => !isNaN(v));

    const allSame = numeric.length > 0 && numeric.every((v) => v === numeric[0]);
    const avg     = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;
    const min     = numeric.length ? Math.min(...numeric) : null;
    const max     = numeric.length ? Math.max(...numeric) : null;

    // Stats grid
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';

    if (avg !== null) {
      grid.appendChild(makeStatCard(
        Number.isInteger(avg) ? avg : avg.toFixed(1),
        allSame ? '🎉 Consenso!' : 'Média',
        allSame,
      ));
    }

    if (!allSame && min !== null) {
      grid.appendChild(makeStatCard(min, 'Mínimo'));
      grid.appendChild(makeStatCard(max, 'Máximo'));
    }

    // Breakdown by value
    const breakdown = document.getElementById('votesBreakdown');
    breakdown.innerHTML = '';

    const grouped = {};
    State.getPlayers().forEach((p) => {
      if (!p.vote) return;
      if (!grouped[p.vote]) grouped[p.vote] = [];
      grouped[p.vote].push(p.name);
    });

    Object.entries(grouped)
      .sort(([a], [b]) => {
        const na = parseFloat(a);
        const nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      })
      .forEach(([val, names]) => {
        const badge = document.createElement('div');
        badge.className = 'vote-badge anim-fade-slide';
        badge.innerHTML = `<span class="badge-val">${val}</span>${names.join(', ')}`;
        breakdown.appendChild(badge);
      });

    if (allSame && numeric.length > 0) {
      toast(`🎉 Consenso! Todos votaram ${numeric[0]}`, 3500);
    }
  }

  function makeStatCard(value, label, consensus = false) {
    const card = document.createElement('div');
    card.className = `result-stat${consensus ? ' consensus' : ''}`;
    card.innerHTML  = `<div class="result-value">${value}</div><div class="result-label">${label}</div>`;
    return card;
  }

  // ── Hand ───────────────────────────────────────────────────

  function renderHand() {
    const hand    = document.getElementById('handCards');
    const myVote  = State.get('myVote');
    hand.innerHTML = '';

    State.FIBONACCI.forEach((val, i) => {
      const card = document.createElement('div');
      const isRed = State.RED_SUITS.has(val);

      card.className     = `play-card${isRed ? ' suit-red' : ''}${myVote === val ? ' selected' : ''}`;
      card.textContent   = val;
      card.setAttribute('data-val', val);
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Votar ${val}`);
      card.setAttribute('aria-pressed', myVote === val ? 'true' : 'false');
      card.style.animationDelay = `${i * 28}ms`;

      card.addEventListener('click', () => onCardClick(val, card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(val, card); }
      });

      hand.appendChild(card);
    });
  }

  function onCardClick(val, cardEl) {
    if (State.get('revealed')) return;

    State.set('myVote', val);

    const myId = State.get('myId');
    const player = State.getPlayer(myId);
    if (player) player.vote = val;

    document.querySelectorAll('.play-card').forEach((c) => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    cardEl.classList.add('selected');
    cardEl.setAttribute('aria-pressed', 'true');

    if (State.get('isHost')) {
      PeerManager.broadcastState();
    } else {
      PeerManager.sendVote(val);
      // Optimistically update local player list
      State.setPlayer(myId, { ...player, vote: val });
    }

    renderPlayers();
    updateVoteCount();
    updateRevealBtn();
  }

  // ── Share & copy ───────────────────────────────────────────

  async function copyRoomLink() {
    const link = buildRoomLink(State.get('roomId'));
    const ok   = await copyText(link);
    toast(ok ? 'Link copiado!' : 'Selecione e copie o link manualmente.');
  }

  return {
    toast,
    setConnStatus,
    setError,
    applyUrlRoom,
    showRoom,
    renderPlayers,
    updateVoteCount,
    updateRevealBtn,
    showResults,
    renderHand,
    copyRoomLink,
  };
})();
