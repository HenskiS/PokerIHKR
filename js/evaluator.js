// Evaluates a 5-card poker hand.
// Returns a score array [handRank, ...tiebreakers] where higher = better.
// handRank: 0=High Card, 1=One Pair, 2=Two Pair, 3=Three of a Kind,
//           4=Straight, 5=Flush, 6=Full House, 7=Four of a Kind, 8=Straight Flush
function evaluateHand(cards) {
  const ranks = cards.map(c => c.rank);
  const suits = cards.map(c => c.suit);

  // Build frequency groups sorted by (count desc, rank desc) for clean tiebreaking
  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
  const groups = Object.entries(freq)
    .map(([r, c]) => ({ rank: +r, count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const counts  = groups.map(g => g.count);
  const gRanks  = groups.map(g => g.rank);

  // Flush: all same suit
  const flush = new Set(suits).size === 1;

  // Straight: 5 unique consecutive ranks (including A-2-3-4-5 wheel)
  const ur = [...new Set(ranks)].sort((a, b) => a - b);
  let straight = false, strHigh = 0;
  if (ur.length === 5) {
    if (ur[4] - ur[0] === 4) {
      straight = true;
      strHigh  = ur[4];
    } else if (ur[0]===2 && ur[1]===3 && ur[2]===4 && ur[3]===5 && ur[4]===14) {
      // Wheel: A-2-3-4-5 (Ace plays low)
      straight = true;
      strHigh  = 5;
    }
  }

  if (flush && straight) return [8, strHigh];
  if (counts[0] === 4)                       return [7, ...gRanks];
  if (counts[0] === 3 && counts[1] === 2)    return [6, ...gRanks];
  if (flush)                                 return [5, ...ranks.slice().sort((a,b) => b-a)];
  if (straight)                              return [4, strHigh];
  if (counts[0] === 3)                       return [3, ...gRanks];
  if (counts[0] === 2 && counts[1] === 2)    return [2, ...gRanks];
  if (counts[0] === 2)                       return [1, ...gRanks];
  return [0, ...gRanks];
}

// Compare two hand score arrays. Returns positive if a > b, negative if a < b, 0 if tie.
function cmpHands(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? -1) - (b[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Best 5-card hand from N cards (N >= 5). Uses C(N,5) enumeration.
function bestHand(cards) {
  if (cards.length < 5) return null;
  if (cards.length === 5) return evaluateHand(cards);
  let best = null;
  const n = cards.length;
  for (let a = 0; a < n-4; a++)
  for (let b = a+1; b < n-3; b++)
  for (let c = b+1; c < n-2; c++)
  for (let d = c+1; d < n-1; d++)
  for (let e = d+1; e < n;   e++) {
    const s = evaluateHand([cards[a], cards[b], cards[c], cards[d], cards[e]]);
    if (!best || cmpHands(s, best) > 0) best = s;
  }
  return best;
}

const HAND_NAMES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind',
  'Straight',  'Flush',    'Full House', 'Four of a Kind', 'Straight Flush'
];

function handName(score) {
  if (!score) return '—';
  if (score[0] === 8 && score[1] === 14) return 'Royal Flush';
  return HAND_NAMES[score[0]];
}

function handDescription(score) {
  if (!score) return '';
  const s = score[0];
  const w = n => RANK_WORD[n]   || n;
  const p = n => RANK_PLURAL[n] || n;
  const r = n => RANK_SYM[n]    || n;

  if (s === 8) return score[1] === 14 ? 'A K Q J 10 — the best possible hand' : `${r(score[1])}-high Straight Flush`;
  if (s === 7) return `Four ${p(score[1])}`;
  if (s === 6) return `${p(score[1])} full of ${p(score[2])}`;
  if (s === 5) return `${r(score[1])}-high Flush`;
  if (s === 4) return score[1] === 5 ? 'Wheel — A-2-3-4-5 (Ace plays low)' : `${r(score[1])}-high Straight`;
  if (s === 3) return `Three ${p(score[1])}`;
  if (s === 2) return `${p(score[1])} and ${p(score[2])}`;
  if (s === 1) return `Pair of ${p(score[1])}`;
  return `${w(score[1])} high`;
}

// For Hold'em pre-flop (only 2 hole cards — no made hand yet)
function describeHoleCards(cards) {
  if (!cards || cards.length !== 2) return '';
  const [c1, c2] = [...cards].sort((a, b) => b.rank - a.rank);
  if (c1.rank === c2.rank) return `Pocket ${RANK_PLURAL[c1.rank]}`;
  const suitedStr = c1.suit === c2.suit ? ' Suited' : ' Offsuit';
  return `${RANK_SYM[c1.rank]}-${RANK_SYM[c2.rank]}${suitedStr}`;
}
