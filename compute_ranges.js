// compute_ranges.js — Recompute RANGE_DATA for all 4 game modes
// Run: node compute_ranges.js
// Mirrors deck.js + evaluator.js + simulator.js exactly.

// ===== deck.js =====
function createDeck() {
  const cards = [];
  for (let suit = 0; suit < 4; suit++)
    for (let rank = 2; rank <= 14; rank++)
      cards.push({ rank, suit });
  return cards;
}
function cardKey(c) { return `${c.rank}-${c.suit}`; }
function shuffleDeck(arr) {
  const d = [...arr];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ===== evaluator.js =====
function evaluateHand(cards) {
  const ranks = cards.map(c => c.rank);
  const suits = cards.map(c => c.suit);
  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
  const groups = Object.entries(freq)
    .map(([r, c]) => ({ rank: +r, count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const counts = groups.map(g => g.count);
  const gRanks = groups.map(g => g.rank);
  const flush = new Set(suits).size === 1;
  const ur = [...new Set(ranks)].sort((a, b) => a - b);
  let straight = false, strHigh = 0;
  if (ur.length === 5) {
    if (ur[4] - ur[0] === 4) { straight = true; strHigh = ur[4]; }
    else if (ur[0]===2&&ur[1]===3&&ur[2]===4&&ur[3]===5&&ur[4]===14) { straight=true; strHigh=5; }
  }
  if (flush && straight) return [8, strHigh];
  if (counts[0] === 4)                    return [7, ...gRanks];
  if (counts[0] === 3 && counts[1] === 2) return [6, ...gRanks];
  if (flush)                              return [5, ...ranks.slice().sort((a,b)=>b-a)];
  if (straight)                           return [4, strHigh];
  if (counts[0] === 3)                    return [3, ...gRanks];
  if (counts[0] === 2 && counts[1] === 2) return [2, ...gRanks];
  if (counts[0] === 2)                    return [1, ...gRanks];
  return [0, ...gRanks];
}
function cmpHands(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

// Returns best score AND the indices (within `cards`) of the winning 5 cards.
function bestHandWithIndices(cards) {
  if (cards.length === 5) return { score: evaluateHand(cards), indices: [0,1,2,3,4] };
  let best = null, bestIdx = null;
  const n = cards.length;
  for (let a=0;a<n-4;a++) for (let b=a+1;b<n-3;b++) for (let c=b+1;c<n-2;c++)
  for (let d=c+1;d<n-1;d++) for (let e=d+1;e<n;e++) {
    const s = evaluateHand([cards[a],cards[b],cards[c],cards[d],cards[e]]);
    if (!best || cmpHands(s,best) > 0) { best = s; bestIdx = [a,b,c,d,e]; }
  }
  return { score: best, indices: bestIdx };
}
function bestHand(cards) { return bestHandWithIndices(cards).score; }

// ===== simulator.js =====
function simulate({ playerCards, communityCards=[], communityNeeded=0,
                    oppCardCount, sharedCommunity=false, numOpponents, numSims=1200 }) {
  const knownKeys = new Set([...playerCards,...communityCards].map(cardKey));
  const pool = createDeck().filter(c => !knownKeys.has(cardKey(c)));
  let equity = 0;
  for (let s = 0; s < numSims; s++) {
    const needed = communityNeeded + oppCardCount * numOpponents;
    const deck = [...pool];
    for (let i = 0; i < needed; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    let idx = 0;
    const simCommunity = [...communityCards];
    for (let i = 0; i < communityNeeded; i++) simCommunity.push(deck[idx++]);
    const playerFull  = [...playerCards, ...simCommunity];
    const playerScore = bestHand(playerFull);
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
    if (!lost) equity += 1 / (1 + tieCount);
  }
  return Math.round(equity / numSims * 100);
}

// ===== RANGE COMPUTATION =====
const HAND_RANK_NAMES = [
  'High Card','One Pair','Two Pair','Three of a Kind',
  'Straight','Flush','Full House','Four of a Kind','Straight Flush'
];

const NUM_OPPONENTS = 5;
const NUM_SIMS      = 1200;
const TARGET        = 60;

// ── Game mode configs ──────────────────────────────────────────────────────────

const MODES = {
  '5stud': {
    label: '5-Card Stud',
    deal() {
      const d = shuffleDeck(createDeck());
      return { playerCards: d.slice(0,5), communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false };
    },
    // Returns { rank, skip } — skip=true to discard this sample
    classify(deal) {
      const score = bestHand(deal.playerCards);
      return { rank: score[0], skip: false };
    }
  },

  '5draw': {
    label: '5-Card Draw (rate mode)',
    deal() {
      const d = shuffleDeck(createDeck());
      return { playerCards: d.slice(0,5), communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false };
    },
    classify(deal) {
      const score = bestHand(deal.playerCards);
      return { rank: score[0], skip: false };
    }
  },

  '7stud': {
    label: '7-Card Stud',
    deal() {
      const d = shuffleDeck(createDeck());
      return { playerCards: d.slice(0,7), communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false };
    },
    classify(deal) {
      const score = bestHand(deal.playerCards);
      return { rank: score[0], skip: false };
    }
  },

  'holdem': {
    label: "Hold'em (at river, hole cards must contribute)",
    deal() {
      const d = shuffleDeck(createDeck());
      // 2 hole cards, then 5 community cards
      return { playerCards: d.slice(0,2), communityCards: d.slice(2,7), communityNeeded:0, oppCardCount:2, sharedCommunity:true };
    },
    classify(deal) {
      const all7 = [...deal.playerCards, ...deal.communityCards];
      const { score, indices } = bestHandWithIndices(all7);
      // Skip if neither hole card (indices 0,1 in all7) appears in the best 5.
      // That's the "plays board" scenario — a split that trains nothing useful.
      const holeContributes = indices.includes(0) || indices.includes(1);
      return { rank: score[0], skip: !holeContributes };
    }
  }
};

// ── Crafted samples for rare hands (flush, full house, quads, SF) ─────────────
// Avoids waiting millions of deals for naturally rare hands.
function s(rank, suit) { return { rank, suit }; }

function rareSamples(modeName) {
  if (modeName === '5stud' || modeName === '5draw') return [
    // Flushes
    { rank:5, deal:{ playerCards:[s(14,0),s(11,0),s(9,0),s(7,0),s(4,0)], communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:5, deal:{ playerCards:[s(8,1),s(6,1),s(5,1),s(3,1),s(2,1)],  communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:5, deal:{ playerCards:[s(13,2),s(11,2),s(9,2),s(7,2),s(5,2)], communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    // Full houses
    { rank:6, deal:{ playerCards:[s(14,0),s(14,1),s(14,2),s(13,0),s(13,1)], communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:6, deal:{ playerCards:[s(2,0),s(2,1),s(2,2),s(3,0),s(3,1)],    communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:6, deal:{ playerCards:[s(7,0),s(7,1),s(7,2),s(9,0),s(9,1)],    communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    // Quads
    { rank:7, deal:{ playerCards:[s(14,0),s(14,1),s(14,2),s(14,3),s(13,0)], communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:7, deal:{ playerCards:[s(2,0),s(2,1),s(2,2),s(2,3),s(3,0)],     communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:7, deal:{ playerCards:[s(8,0),s(8,1),s(8,2),s(8,3),s(14,0)],    communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    // Straight flushes (low to high)
    { rank:8, deal:{ playerCards:[s(14,0),s(2,0),s(3,0),s(4,0),s(5,0)],    communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:8, deal:{ playerCards:[s(6,1),s(7,1),s(8,1),s(9,1),s(10,1)],    communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
    { rank:8, deal:{ playerCards:[s(10,2),s(11,2),s(12,2),s(13,2),s(14,2)], communityCards:[], communityNeeded:0, oppCardCount:5, sharedCommunity:false }},
  ];

  if (modeName === '7stud') return [
    // Flushes (best 5-from-7 is flush)
    { rank:5, deal:{ playerCards:[s(14,0),s(11,0),s(9,0),s(7,0),s(4,0),s(6,1),s(8,2)],  communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    { rank:5, deal:{ playerCards:[s(8,1),s(6,1),s(5,1),s(3,1),s(2,1),s(10,0),s(14,2)],  communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    // Full houses
    { rank:6, deal:{ playerCards:[s(14,0),s(14,1),s(14,2),s(13,0),s(13,1),s(7,2),s(4,3)], communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    { rank:6, deal:{ playerCards:[s(2,0),s(2,1),s(2,2),s(3,0),s(3,1),s(9,0),s(13,1)],    communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    { rank:6, deal:{ playerCards:[s(7,0),s(7,1),s(7,2),s(9,0),s(9,1),s(4,2),s(11,3)],    communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    // Quads
    { rank:7, deal:{ playerCards:[s(14,0),s(14,1),s(14,2),s(14,3),s(13,0),s(7,1),s(4,2)], communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    { rank:7, deal:{ playerCards:[s(2,0),s(2,1),s(2,2),s(2,3),s(3,0),s(9,1),s(13,2)],    communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    { rank:7, deal:{ playerCards:[s(8,0),s(8,1),s(8,2),s(8,3),s(14,0),s(7,1),s(4,2)],    communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    // Straight flushes
    { rank:8, deal:{ playerCards:[s(6,0),s(7,0),s(8,0),s(9,0),s(10,0),s(2,1),s(14,2)],   communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
    { rank:8, deal:{ playerCards:[s(10,3),s(11,3),s(12,3),s(13,3),s(14,3),s(2,0),s(4,1)], communityCards:[], communityNeeded:0, oppCardCount:7, sharedCommunity:false }},
  ];

  if (modeName === 'holdem') return [
    // Full houses — hole cards contribute
    { rank:6, deal:{ playerCards:[s(14,0),s(14,1)], communityCards:[s(14,2),s(13,0),s(13,1),s(7,2),s(4,3)], communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:6, deal:{ playerCards:[s(7,0),s(7,1)],   communityCards:[s(7,2),s(9,0),s(9,1),s(4,2),s(11,3)],   communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:6, deal:{ playerCards:[s(2,0),s(3,0)],   communityCards:[s(2,1),s(2,2),s(3,1),s(9,2),s(13,3)],   communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    // Quads — hole cards contribute (player has pocket pair + two more on board)
    { rank:7, deal:{ playerCards:[s(14,0),s(14,1)], communityCards:[s(14,2),s(14,3),s(13,0),s(7,1),s(4,2)], communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:7, deal:{ playerCards:[s(2,0),s(2,1)],   communityCards:[s(2,2),s(2,3),s(3,0),s(9,1),s(13,2)],   communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:7, deal:{ playerCards:[s(8,0),s(8,1)],   communityCards:[s(8,2),s(8,3),s(14,0),s(7,1),s(4,2)],   communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    // Straight flushes — hole cards are the SF (hole cards definitely contribute)
    { rank:8, deal:{ playerCards:[s(10,0),s(11,0)], communityCards:[s(12,0),s(13,0),s(14,0),s(2,1),s(4,2)], communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:8, deal:{ playerCards:[s(6,1),s(7,1)],   communityCards:[s(8,1),s(9,1),s(10,1),s(3,0),s(14,2)],  communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:8, deal:{ playerCards:[s(2,2),s(3,2)],   communityCards:[s(4,2),s(5,2),s(14,2),s(9,0),s(13,1)],  communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
    { rank:8, deal:{ playerCards:[s(7,3),s(8,3)],   communityCards:[s(9,3),s(10,3),s(11,3),s(2,0),s(14,1)], communityNeeded:0, oppCardCount:2, sharedCommunity:true }},
  ];

  return [];
}

// ── Main computation ──────────────────────────────────────────────────────────
function computeRangesForMode(modeName, modeConfig) {
  const minArr  = new Array(9).fill(Infinity);
  const maxArr  = new Array(9).fill(-Infinity);
  const counts  = new Array(9).fill(0);
  const allPcts = Array.from({length:9}, () => []);

  // Inject crafted rare-hand samples first
  for (const { rank, deal } of rareSamples(modeName)) {
    if (counts[rank] >= TARGET) continue;
    const winPct = simulate({ ...deal, numOpponents: NUM_OPPONENTS, numSims: NUM_SIMS });
    counts[rank]++;
    allPcts[rank].push(winPct);
    if (winPct < minArr[rank]) minArr[rank] = winPct;
    if (winPct > maxArr[rank]) maxArr[rank] = winPct;
  }

  // Random sampling until TARGET reached per rank
  let totalDeals = 0;
  const MAX_DEALS = 300_000;
  while (counts.some(c => c < TARGET) && totalDeals < MAX_DEALS) {
    totalDeals++;
    const deal = modeConfig.deal();
    const { rank, skip } = modeConfig.classify(deal);
    if (skip || counts[rank] >= TARGET) continue;

    const winPct = simulate({ ...deal, numOpponents: NUM_OPPONENTS, numSims: NUM_SIMS });
    counts[rank]++;
    allPcts[rank].push(winPct);
    if (winPct < minArr[rank]) minArr[rank] = winPct;
    if (winPct > maxArr[rank]) maxArr[rank] = winPct;

    if (totalDeals % 500 === 0) {
      const prog = counts.map((c,i) => `${HAND_RANK_NAMES[i].split(' ')[0]}:${c}`).join(' ');
      process.stdout.write(`\r  [${prog}] deals=${totalDeals}   `);
    }
  }
  process.stdout.write('\n');
  return { minArr, maxArr, counts, allPcts };
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log(`\nPoker Win% Range Computation`);
console.log(`Opponents: ${NUM_OPPONENTS}  |  Sims/sample: ${NUM_SIMS}  |  Target samples/rank: ${TARGET}\n`);

const results = {};
for (const [modeName, modeConfig] of Object.entries(MODES)) {
  console.log(`\n=== ${modeConfig.label} ===`);
  const { minArr, maxArr, counts, allPcts } = computeRangesForMode(modeName, modeConfig);
  results[modeName] = { minArr, maxArr, counts };

  for (let rank = 0; rank < 9; rank++) {
    const n = counts[rank];
    if (n === 0) { console.log(`  ${HAND_RANK_NAMES[rank].padEnd(20)}: — (no samples)`); continue; }
    const avg    = Math.round(allPcts[rank].reduce((a,b)=>a+b,0) / n);
    const sparse = n < TARGET ? ' ⚠ sparse' : '';
    console.log(`  ${HAND_RANK_NAMES[rank].padEnd(20)}: ${String(minArr[rank]).padStart(3)}%–${String(maxArr[rank]).padStart(3)}%  avg=${avg}%  n=${n}${sparse}`);
  }
}

// ── Output updated RANGE_DATA for copy-paste ──────────────────────────────────
console.log('\n\n===== UPDATED RANGE_DATA =====');
const modeMap = { '5stud':"'5stud'", '5draw':"'5draw'", '7stud':"'7stud'", 'holdem':"'holdem'" };
console.log('const RANGE_DATA = {');
for (const [modeName, { minArr, maxArr, counts }] of Object.entries(results)) {
  console.log(`  ${modeMap[modeName]}: [`);
  for (let rank = 0; rank < 9; rank++) {
    const n = counts[rank];
    let min, max;
    if (n === 0) {
      min = rank >= 7 ? 100 : 0;
      max = rank >= 7 ? 100 : 0;
    } else {
      min = minArr[rank]; max = maxArr[rank];
    }
    console.log(`    { name: '${HAND_RANK_NAMES[rank].padEnd(16)}', min: ${String(min).padStart(3)}, max: ${String(max).padStart(3)} },`);
  }
  console.log('  ],');
}
console.log('};');
