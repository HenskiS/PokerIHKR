// Monte Carlo simulation for poker win probability.
//
// params:
//   playerCards     - cards the player holds privately (hole cards / full hand)
//   communityCards  - community cards already on the board (Hold'em only)
//   communityNeeded - how many more community cards to deal in simulation
//   oppCardCount    - number of cards to deal each opponent
//   sharedCommunity - true for Hold'em (opponents share community), false for stud/draw
//   numOpponents    - how many opponents (default 3)
//   numSims         - number of Monte Carlo iterations (default 2000)
//
// Returns: { winPct } — integer 0-100

function simulate({ playerCards, communityCards = [], communityNeeded = 0,
                    oppCardCount, sharedCommunity = false,
                    numOpponents = 3, numSims = 2000 }) {

  const knownKeys = new Set(
    [...playerCards, ...communityCards].map(cardKey)
  );

  // Build the pool of available cards once
  const pool = createDeck().filter(c => !knownKeys.has(cardKey(c)));

  let equity = 0;

  for (let s = 0; s < numSims; s++) {
    // Partial Fisher-Yates: shuffle only as many cards as we need
    const needed = communityNeeded + oppCardCount * numOpponents;
    const deck   = [...pool];
    for (let i = 0; i < needed; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    let idx = 0;

    // Complete community cards
    const simCommunity = [...communityCards];
    for (let i = 0; i < communityNeeded; i++) simCommunity.push(deck[idx++]);

    // Evaluate player
    const playerFull  = [...playerCards, ...simCommunity];
    const playerScore = bestHand(playerFull);

    // Evaluate each opponent — track exact number of ties for correct split equity
    let lost = false, tieCount = 0;
    for (let o = 0; o < numOpponents; o++) {
      const oHole = deck.slice(idx, idx + oppCardCount);
      idx += oppCardCount;
      const oFull  = sharedCommunity ? [...oHole, ...simCommunity] : oHole;
      const oScore = bestHand(oFull);
      const cmp    = cmpHands(playerScore, oScore);
      if (cmp < 0) { lost = true; break; }
      if (cmp === 0) tieCount++;
    }

    // 1/(1+tieCount) gives correct equity: 1.0 for outright win, 0.5 for 2-way split,
    // 0.33 for 3-way, 0.25 for 4-way, etc.
    if (!lost) equity += 1 / (1 + tieCount);
  }

  return { winPct: Math.round(equity / numSims * 100) };
}

// ---- 5-Card Draw: draw decision simulation ----

// Simulate keeping a subset of cards and drawing replacements vs opponents.
function simulateDraw(keepCards, drawCount, numOpponents, numSims = 300) {
  const knownKeys = new Set(keepCards.map(cardKey));
  const pool = createDeck().filter(c => !knownKeys.has(cardKey(c)));
  let equity = 0;

  for (let s = 0; s < numSims; s++) {
    const needed = drawCount + numOpponents * 5;
    const deck   = [...pool];
    for (let i = 0; i < needed; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    let idx = 0;
    const playerHand  = [...keepCards, ...deck.slice(idx, idx + drawCount)];
    idx += drawCount;
    const playerScore = evaluateHand(playerHand);

    let lost = false, tieCount = 0;
    for (let o = 0; o < numOpponents; o++) {
      const oScore = evaluateHand(deck.slice(idx, idx + 5));
      idx += 5;
      const cmp = cmpHands(playerScore, oScore);
      if (cmp < 0) { lost = true; break; }
      if (cmp === 0) tieCount++;
    }
    if (!lost) equity += 1 / (1 + tieCount);
  }
  return Math.round(equity / numSims * 100);
}

// Generate all C(n, r) index combinations.
function indexCombos(n, r) {
  const result = [];
  function go(start, combo) {
    if (combo.length === r) { result.push([...combo]); return; }
    for (let i = start; i <= n - (r - combo.length); i++) {
      combo.push(i); go(i + 1, combo); combo.pop();
    }
  }
  go(0, []);
  return result;
}

// Try all 26 keep-sets (draw 0–3) and return the one with the best expected win %.
// Returns { keepIndices, discardIndices, keepCards, drawCount, winPct }
function findOptimalDraw(hand, numOpponents = 3, maxDraw = 3) {
  let best = null;
  for (let draw = 0; draw <= maxDraw; draw++) {
    for (const keepIdx of indexCombos(hand.length, hand.length - draw)) {
      const keepCards = keepIdx.map(i => hand[i]);
      const winPct    = simulateDraw(keepCards, draw, numOpponents, 300);
      if (!best || winPct > best.winPct) {
        best = {
          keepIndices:    keepIdx,
          discardIndices: [0,1,2,3,4].filter(i => !keepIdx.includes(i)),
          keepCards,
          drawCount: draw,
          winPct
        };
      }
    }
  }
  return best;
}

// Build the sim params for each game mode
function getSimParams(mode, deal, numOpponents) {
  switch (mode) {
    case 'holdem':
      return {
        playerCards:     deal.holeCards,
        communityCards:  deal.communityCards,
        communityNeeded: 5 - deal.communityCards.length,
        oppCardCount:    2,
        sharedCommunity: true,
        numOpponents
      };
    case 'draw5':
      return {
        playerCards:     deal.hand,
        communityCards:  [],
        communityNeeded: 0,
        oppCardCount:    5,
        sharedCommunity: false,
        numOpponents
      };
    case 'stud5':
      return {
        playerCards:     [...deal.holeCard, ...deal.upCards],
        communityCards:  [],
        communityNeeded: 0,
        oppCardCount:    5,
        sharedCommunity: false,
        numOpponents
      };
    case 'stud7':
      return {
        playerCards:     [...deal.holeCards, ...deal.upCards],
        communityCards:  [],
        communityNeeded: 0,
        oppCardCount:    7,
        sharedCommunity: false,
        numOpponents
      };
  }
}
