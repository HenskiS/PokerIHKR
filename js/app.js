// ---- State ----
const state = {
  mode:             'holdem',
  drawSubMode:      'rate',   // 'rate' | 'decide'  (only relevant in draw5 mode)
  selectedDiscards: [],       // card indices marked for discard in decide mode
  deal:             null,
  phase:            'guessing',
  opponents:        3,
  score:            { points: 0, hands: 0, totalError: 0 }
};

const STREETS = ['Pre-flop', 'Flop', 'Turn', 'River'];

// ---- Persistent stats (localStorage) ----
function statsKey() {
  if (state.mode === 'draw5') return `stats_draw5_${state.drawSubMode}`;
  return `stats_${state.mode}`;
}

function loadStats() {
  try {
    const d = JSON.parse(localStorage.getItem(statsKey()) || '{}');
    return { points: d.points || 0, hands: d.hands || 0, totalError: d.totalError || 0 };
  } catch { return { points: 0, hands: 0, totalError: 0 }; }
}

function saveStats() {
  localStorage.setItem(statsKey(), JSON.stringify(state.score));
}

// ---- Dealing ----
function dealHand() {
  const deck = shuffle(createDeck());
  let i = 0;
  const take = n => deck.slice(i, i += n);

  switch (state.mode) {
    case 'holdem': {
      const street       = Math.floor(Math.random() * 4);
      const holeCards    = take(2);
      const communityCards = [];
      if (street >= 1) communityCards.push(...take(3));
      if (street >= 2) communityCards.push(...take(1));
      if (street >= 3) communityCards.push(...take(1));
      return { holeCards, communityCards, street };
    }
    case 'draw5':
      return { hand: take(5) };
    case 'stud5':
      return { holeCard: take(1), upCards: take(4) };
    case 'stud7':
      return { holeCards: take(2), upCards: take(5) };
  }
}

// ---- Card Rendering ----
// opts: { selectable, discarding, isNew, index }
function renderCard(card, faceDown = false, opts = {}) {
  if (faceDown) return `<div class="card face-down" aria-label="face down card"></div>`;
  const rank  = RANK_SYM[card.rank];
  const suit  = SUIT_SYM[card.suit];
  const color = isRed(card) ? 'red' : 'black';
  const extra = opts.discarding ? ' discarding' : opts.isNew ? ' card-new' : '';
  const sel   = opts.selectable ? ' selectable' : '';
  const idx   = opts.index !== undefined ? ` data-index="${opts.index}"` : '';
  return `<div class="card ${color}${extra}${sel}"${idx} aria-label="${RANK_WORD[card.rank]} of ${SUIT_NAME[card.suit]}">
    <div class="card-top">${rank}</div>
    <div class="card-suit">${suit}</div>
    <div class="card-bot">${rank}</div>
  </div>`;
}

function renderCardsArea() {
  const d = state.deal;
  if (!d) return '';

  switch (state.mode) {
    case 'holdem': {
      const streetLabel = d.street > 0
        ? `<span class="street-badge">${STREETS[d.street]}</span>` : '';
      const holeHtml = d.holeCards.map(c => renderCard(c)).join('');
      const commHtml = d.communityCards.length
        ? `<div class="card-group">
             <div class="group-label">Community</div>
             <div class="cards-row">${d.communityCards.map(c => renderCard(c)).join('')}</div>
           </div>`
        : '';
      return `
        <div class="card-group">
          <div class="group-label">Your Hand ${streetLabel}</div>
          <div class="cards-row">${holeHtml}</div>
        </div>
        ${commHtml}`;
    }

    case 'draw5': {
      if (state.drawSubMode === 'decide') {
        const cardsHtml = d.hand.map((c, i) => renderCard(c, false, {
          selectable:  true,
          discarding:  state.selectedDiscards.includes(i),
          index:       i
        })).join('');
        return `
          <div class="card-group">
            <div class="group-label">Tap cards to discard <span class="muted-badge">(max 3)</span></div>
            <div class="cards-row">${cardsHtml}</div>
          </div>`;
      }
      return `
        <div class="card-group">
          <div class="group-label">Your Hand</div>
          <div class="cards-row">${d.hand.map(c => renderCard(c)).join('')}</div>
        </div>`;
    }

    case 'stud5':
      return `
        <div class="card-group">
          <div class="group-label">Your Hand</div>
          <div class="cards-row">
            ${renderCard(d.holeCard[0])}
            ${d.upCards.map(c => renderCard(c)).join('')}
          </div>
          <div class="stud-hint">
            <span class="hole-hint">↑ hole (private)</span>
            <span class="up-hint">↑ face-up (visible to all)</span>
          </div>
        </div>`;

    case 'stud7':
      return `
        <div class="card-group">
          <div class="group-label">Your Hand <span class="street-badge">Best 5 from 7</span></div>
          <div class="stud7-rows">
            <div class="stud7-section">
              <div class="stud7-label">Hole (private)</div>
              <div class="cards-row">${d.holeCards.map(c => renderCard(c)).join('')}</div>
            </div>
            <div class="stud7-section">
              <div class="stud7-label">Face up</div>
              <div class="cards-row">${d.upCards.map(c => renderCard(c)).join('')}</div>
            </div>
          </div>
        </div>`;
  }
}

// ---- Decide mode: card tap listeners ----
function attachDecideListeners() {
  document.querySelectorAll('#cards-area .card[data-index]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const pos = state.selectedDiscards.indexOf(idx);
      if (pos === -1) {
        if (state.selectedDiscards.length >= 3) return;
        state.selectedDiscards.push(idx);
        el.classList.add('discarding');
      } else {
        state.selectedDiscards.splice(pos, 1);
        el.classList.remove('discarding');
      }
      updateDrawButton();
    });
  });
}

function updateDrawButton() {
  const n   = state.selectedDiscards.length;
  const btn = document.getElementById('submit-btn');
  btn.textContent = n === 0 ? 'Stand Pat (keep all 5)' : `Draw ${n} card${n > 1 ? 's' : ''}`;
}

// ---- Get best hand score for display ----
function getHandScore() {
  const d = state.deal;
  switch (state.mode) {
    case 'holdem': return bestHand([...d.holeCards, ...d.communityCards]);
    case 'draw5':  return bestHand(d.hand);
    case 'stud5':  return bestHand([...d.holeCard, ...d.upCards]);
    case 'stud7':  return bestHand([...d.holeCards, ...d.upCards]);
  }
}

// ---- Slider ----
function updateSliderDisplay(v) {
  document.getElementById('slider-value').textContent = v + '%';
}

// ---- Submit (rate mode) ----
function onSubmit() {
  if (state.phase !== 'guessing') return;
  if (state.mode === 'draw5' && state.drawSubMode === 'decide') { onDraw(); return; }

  state.phase = 'calculating';
  const guess = parseInt(document.getElementById('slider').value);
  const btn   = document.getElementById('submit-btn');
  btn.textContent = 'Calculating…';
  btn.disabled    = true;

  setTimeout(() => {
    const params = getSimParams(state.mode, state.deal, state.opponents);
    const result = simulate({ ...params, numSims: 2000 });
    const actual = result.winPct;
    const error  = Math.abs(guess - actual);

    state.score.hands++;
    state.score.totalError += error;
    if      (error <=  5) state.score.points += 3;
    else if (error <= 10) state.score.points += 2;
    else if (error <= 20) state.score.points += 1;
    saveStats();

    state.phase = 'revealed';
    renderReveal(guess, actual, error);
    updateScoreDisplay();
  }, 40);
}

// ---- Draw (decide mode) ----
function onDraw() {
  if (state.phase !== 'guessing') return;
  state.phase = 'calculating';
  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Calculating…';
  btn.disabled    = true;

  setTimeout(() => {
    const discardIdx = [...state.selectedDiscards];
    const keepIdx    = [0,1,2,3,4].filter(i => !discardIdx.includes(i));
    const keepCards  = keepIdx.map(i => state.deal.hand[i]);
    const drawCount  = discardIdx.length;

    // Draw replacement cards
    const knownKeys = new Set(state.deal.hand.map(cardKey));
    const pool      = shuffle(createDeck().filter(c => !knownKeys.has(cardKey(c))));
    const newCards  = pool.slice(0, drawCount);

    // Build final hand preserving original positions
    const finalHand = [...state.deal.hand];
    discardIdx.forEach((origPos, j) => { finalHand[origPos] = newCards[j]; });

    // Compute user's expected win% and optimal draw
    const userExpected = simulateDraw(keepCards, drawCount, state.opponents, 500);
    const optimal      = findOptimalDraw(state.deal.hand, state.opponents, 3);

    // Score: based on difference from optimal expected win%
    const diff = optimal.winPct - userExpected;
    state.score.hands++;
    state.score.totalError += diff;
    if      (diff <=  0) state.score.points += 3; // matched or beat optimal
    else if (diff <=  3) state.score.points += 2;
    else if (diff <=  8) state.score.points += 1;
    saveStats();

    state.phase = 'revealed';
    renderDrawReveal(finalHand, keepIdx, discardIdx, userExpected, optimal);
    updateScoreDisplay();
  }, 40);
}

// ---- Scroll reveal into view ----
function scrollToReveal() {
  setTimeout(() => {
    document.getElementById('reveal-area').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 80);
}

// ---- Reveal (rate mode) ----
function renderReveal(guess, actual, error) {
  const score     = getHandScore();
  const isPreflop = state.mode === 'holdem' && state.deal.communityCards.length === 0;
  const name      = isPreflop ? describeHoleCards(state.deal.holeCards) : handName(score);
  const desc      = isPreflop
    ? 'Pre-flop — no community cards yet'
    : (state.mode === 'holdem' && score && score[0] < 3)
      ? `${handDescription(score)} · your hole cards: ${state.deal.holeCards.map(c => RANK_SYM[c.rank] + SUIT_SYM[c.suit]).join(' ')}`
      : handDescription(score);

  let ratingText, ratingClass, ratingIcon;
  if      (error <=  5) { ratingText = 'Excellent!';    ratingClass = 'excellent'; ratingIcon = '★★★'; }
  else if (error <= 10) { ratingText = 'Good';          ratingClass = 'good';      ratingIcon = '★★';  }
  else if (error <= 20) { ratingText = 'Getting there'; ratingClass = 'ok';        ratingIcon = '★';   }
  else                  { ratingText = 'Way off';       ratingClass = 'off';       ratingIcon = '○';   }

  const guessDir = guess > actual
    ? `${guess - actual}% too high`
    : guess < actual ? `${actual - guess}% too low` : 'spot on';

  document.getElementById('reveal-area').innerHTML = `
    <div class="reveal-card">
      <div class="hand-name">${name}</div>
      <div class="hand-desc">${desc}</div>
      <div class="win-bar-wrap">
        <div class="win-bar" style="width:${actual}%"></div>
        <span class="win-bar-label">${actual}% win rate vs ${state.opponents} opponents</span>
      </div>
      <div class="guess-row">
        <div class="guess-cell">
          <div class="guess-num">${guess}%</div>
          <div class="guess-lbl">Your guess</div>
        </div>
        <div class="guess-cell">
          <div class="guess-num">${actual}%</div>
          <div class="guess-lbl">Actual</div>
        </div>
        <div class="guess-cell">
          <div class="guess-num ${ratingClass}">${error}%</div>
          <div class="guess-lbl">${guessDir}</div>
        </div>
      </div>
      <div class="rating ${ratingClass}">${ratingIcon} ${ratingText}</div>
    </div>`;

  document.getElementById('submit-btn').style.display = 'none';
  document.getElementById('next-btn').style.display   = 'block';
  scrollToReveal();
}

// ---- Reveal (decide mode) ----
function sameKeepSet(a, b) {
  const sa = [...a].sort((x,y) => x-y);
  const sb = [...b].sort((x,y) => x-y);
  return sa.length === sb.length && sa.every((v,i) => v === sb[i]);
}

function renderDrawReveal(finalHand, keepIdx, discardIdx, userExpected, optimal) {
  const score = evaluateHand(finalHand);
  const name  = handName(score);
  const desc  = handDescription(score);

  const isOptimal = sameKeepSet(keepIdx, optimal.keepIndices);
  const diff      = Math.max(0, optimal.winPct - userExpected);

  let ratingText, ratingClass, ratingIcon;
  if      (isOptimal || diff === 0) { ratingText = 'Optimal draw!';            ratingClass = 'excellent'; ratingIcon = '★★★'; }
  else if (diff <= 3)               { ratingText = `Close — ${diff}% from optimal`; ratingClass = 'good'; ratingIcon = '★★'; }
  else if (diff <= 8)               { ratingText = `Suboptimal — ${diff}% from optimal`; ratingClass = 'ok'; ratingIcon = '★'; }
  else                              { ratingText = `Wrong draw — ${diff}% from optimal`; ratingClass = 'off'; ratingIcon = '○'; }

  // Show final hand: new cards highlighted
  const finalCardsHtml = finalHand.map((c, i) =>
    renderCard(c, false, { isNew: discardIdx.includes(i) })
  ).join('');

  // Optimal cards display (only if different from what user did)
  const optimalSection = isOptimal ? '' : `
    <div class="optimal-row">
      <div class="group-label" style="margin-bottom:6px">
        Optimal: ${optimal.drawCount === 0 ? 'stand pat' : `draw ${optimal.drawCount}`}
        <span class="muted-badge">${optimal.winPct}% expected</span>
      </div>
      <div class="cards-row">${optimal.keepCards.map(c => renderCard(c)).join('')}</div>
    </div>`;

  // Update cards area to show the final drawn hand
  document.getElementById('cards-area').innerHTML = `
    <div class="card-group">
      <div class="group-label">Final Hand <span class="muted-badge">highlighted = new cards</span></div>
      <div class="cards-row">${finalCardsHtml}</div>
    </div>`;

  document.getElementById('reveal-area').innerHTML = `
    <div class="reveal-card">
      <div class="hand-name">${name}</div>
      <div class="hand-desc">${desc}</div>
      <div class="win-bar-wrap">
        <div class="win-bar" style="width:${userExpected}%"></div>
        <span class="win-bar-label">Your draw: ~${userExpected}% expected</span>
      </div>
      ${optimalSection}
      <div class="rating ${ratingClass}">${ratingIcon} ${ratingText}</div>
    </div>`;

  document.getElementById('submit-btn').style.display = 'none';
  document.getElementById('next-btn').style.display   = 'block';
  scrollToReveal();
}

// ---- Next Hand ----
function onNext() {
  state.deal             = dealHand();
  state.phase            = 'guessing';
  state.selectedDiscards = [];

  const isDecide = state.mode === 'draw5' && state.drawSubMode === 'decide';

  document.getElementById('cards-area').innerHTML  = renderCardsArea();
  document.getElementById('reveal-area').innerHTML = '';

  // Show/hide slider section based on mode
  document.body.classList.toggle('decide-mode', isDecide);

  if (isDecide) {
    attachDecideListeners();
    updateDrawButton();
  } else {
    document.getElementById('slider').value = 50;
    updateSliderDisplay(50);
    document.querySelectorAll('.strength-btn').forEach(b => b.classList.remove('selected'));
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled    = false;
  submitBtn.style.display = 'block';
  if (!isDecide) submitBtn.textContent = 'Submit';
  document.getElementById('next-btn').style.display = 'none';
}

// ---- Sub-mode (draw5 only) ----
function setDrawSubMode(submode) {
  state.drawSubMode = submode;
  document.querySelectorAll('.sub-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.submode === submode)
  );
  state.score = loadStats();
  updateScoreDisplay();
  onNext();
}

// ---- Score display ----
function updateScoreDisplay() {
  const { points, hands, totalError } = state.score;
  const avgErr = hands > 0 ? Math.round(totalError / hands) : 0;
  const label  = (state.mode === 'draw5' && state.drawSubMode === 'decide')
    ? `${points} pts · ${hands} hand${hands !== 1 ? 's' : ''} · avg ${avgErr}% from optimal`
    : `${points} pts · ${hands} hand${hands !== 1 ? 's' : ''} · avg error ${avgErr}%`;
  document.getElementById('score-display').textContent = label;
}

// ---- Stats view ----
const ALL_STAT_KEYS = [
  { key: 'stats_holdem',       label: "Hold'em",         isDecide: false },
  { key: 'stats_draw5_rate',   label: '5-Draw · Rate',   isDecide: false },
  { key: 'stats_draw5_decide', label: '5-Draw · Decide', isDecide: true  },
  { key: 'stats_stud5',        label: '5-Stud',          isDecide: false },
  { key: 'stats_stud7',        label: '7-Stud',          isDecide: false },
];

function renderStatsHTML() {
  let totalHands = 0, totalPoints = 0;
  const rows = ALL_STAT_KEYS.map(({ key, label, isDecide }) => {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
    const hands  = d.hands  || 0;
    const points = d.points || 0;
    const err    = hands > 0 ? Math.round((d.totalError || 0) / hands) : null;
    totalHands  += hands;
    totalPoints += points;
    const dim = hands === 0 ? ' dim' : '';
    const errStr = err === null ? '—' : isDecide ? `${err}% off` : `${err}% err`;
    return `<div class="stats-row">
      <div class="stats-mode-name">${label}</div>
      <div class="stats-val${dim}">${hands || '—'}</div>
      <div class="stats-val${dim}">${points || '—'}</div>
      <div class="stats-val${dim}">${errStr}</div>
    </div>`;
  }).join('');

  return `
    <div class="stats-table">
      <div class="stats-row stats-header">
        <div>Mode</div><div>Hands</div><div>Pts</div><div>Accuracy</div>
      </div>
      ${rows}
      <div class="stats-row stats-total">
        <div class="stats-mode-name">Total</div>
        <div class="stats-val">${totalHands || '—'}</div>
        <div class="stats-val">${totalPoints || '—'}</div>
        <div class="stats-val dim"></div>
      </div>
    </div>
    <button id="stats-reset-btn" class="btn btn-danger">Reset All Stats</button>`;
}

function showStatsView() {
  document.getElementById('cards-area').style.display    = 'none';
  document.getElementById('reveal-area').innerHTML       = '';
  document.getElementById('sub-mode-bar').style.display  = 'none';
  document.querySelector('.guess-section').style.display = 'none';
  const sv = document.getElementById('stats-view');
  sv.style.display = 'flex';
  sv.innerHTML = renderStatsHTML();
  document.getElementById('stats-reset-btn').addEventListener('click', resetAllStats);
}

function showGameView() {
  document.getElementById('stats-view').style.display    = 'none';
  document.getElementById('cards-area').style.display    = '';
  document.querySelector('.guess-section').style.display = '';
}

function resetAllStats() {
  if (!confirm('Reset all stats? This cannot be undone.')) return;
  ALL_STAT_KEYS.forEach(({ key }) => localStorage.removeItem(key));
  state.score = { points: 0, hands: 0, totalError: 0 };
  updateScoreDisplay();
  const sv = document.getElementById('stats-view');
  sv.innerHTML = renderStatsHTML();
  document.getElementById('stats-reset-btn').addEventListener('click', resetAllStats);
}

// ---- Init ----
function init() {
  // Mode tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const newMode = tab.dataset.mode;
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (newMode === 'stats') { showStatsView(); return; }

      const comingFromStats = document.getElementById('stats-view').style.display !== 'none';
      showGameView();
      if (newMode === state.mode && !comingFromStats) return;
      state.mode = newMode;

      // Show sub-mode bar only for 5-draw
      const bar = document.getElementById('sub-mode-bar');
      bar.style.display = state.mode === 'draw5' ? 'flex' : 'none';

      state.score = loadStats();
      updateScoreDisplay();
      onNext();
    });
  });

  // Sub-mode buttons (5-Draw only)
  document.querySelectorAll('.sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.submode !== state.drawSubMode) setDrawSubMode(btn.dataset.submode);
    });
  });

  // Opponents buttons
  document.querySelectorAll('.opp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.opponents = parseInt(btn.dataset.opp);
      document.querySelectorAll('.opp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Strength buttons — snap slider and auto-submit
  document.querySelectorAll('.strength-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.phase !== 'guessing') return;
      const v = parseInt(btn.dataset.value);
      slider.value = v;
      updateSliderDisplay(v);
      document.querySelectorAll('.strength-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSubmit();
    });
  });

  // Slider
  const slider = document.getElementById('slider');
  slider.addEventListener('input', () => {
    updateSliderDisplay(parseInt(slider.value));
    document.querySelectorAll('.strength-btn').forEach(b => b.classList.remove('selected'));
  });

  // Buttons
  document.getElementById('submit-btn').addEventListener('click', onSubmit);
  document.getElementById('next-btn').addEventListener('click', () => {
    onNext();
    document.getElementById('app').scrollTop = 0;
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  state.score = loadStats();
  onNext();
  updateScoreDisplay();
}

document.addEventListener('DOMContentLoaded', init);
