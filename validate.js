// Validation script — run with: node validate.js
// Compare these outputs against PokerStove, Equilab, or CardPlayer odds calculator.

eval(require('fs').readFileSync('js/deck.js','utf8'));
eval(require('fs').readFileSync('js/evaluator.js','utf8'));
eval(require('fs').readFileSync('js/simulator.js','utf8'));

const SIMS = 10000; // more sims = more accurate, but slower

function run(label, params) {
  const { winPct } = simulate({ ...params, numSims: SIMS });
  console.log(`${winPct.toString().padStart(3)}%  ${label}`);
}

console.log('\n=== MATHEMATICAL CERTAINTIES ===');

run('Royal Flush vs 3 opponents (must be 100%)', {
  playerCards:     [{rank:14,suit:0},{rank:13,suit:0},{rank:12,suit:0},{rank:11,suit:0},{rank:10,suit:0}],
  communityCards: [], communityNeeded: 0, oppCardCount: 5, sharedCommunity: false, numOpponents: 3
});

run('Four Aces vs 3 opponents (should be ~99%+)', {
  playerCards:     [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:14,suit:3},{rank:13,suit:0}],
  communityCards: [], communityNeeded: 0, oppCardCount: 5, sharedCommunity: false, numOpponents: 3
});

run('72 offsuit (worst hand) vs 3 opponents 5-card draw (should be ~18-22%)', {
  playerCards:     [{rank:7,suit:0},{rank:2,suit:1},{rank:9,suit:2},{rank:4,suit:3},{rank:11,suit:0}],
  communityCards: [], communityNeeded: 0, oppCardCount: 5, sharedCommunity: false, numOpponents: 3
});

console.log('\n=== HOLD\'EM PRE-FLOP (widely published, compare against Equilab/PokerStove) ===');
// All heads-up (1 opponent) first — most reference tables use heads-up

run("AA vs 1 opponent  (published: ~85%)", {
  playerCards: [{rank:14,suit:0},{rank:14,suit:1}],
  communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: 1
});

run("KK vs 1 opponent  (published: ~82%)", {
  playerCards: [{rank:13,suit:0},{rank:13,suit:1}],
  communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: 1
});

run("QQ vs 1 opponent  (published: ~80%)", {
  playerCards: [{rank:12,suit:0},{rank:12,suit:1}],
  communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: 1
});

run("AKs vs 1 opponent (published: ~67%)", {
  playerCards: [{rank:14,suit:0},{rank:13,suit:0}],
  communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: 1
});

run("AKo vs 1 opponent (published: ~65%)", {
  playerCards: [{rank:14,suit:0},{rank:13,suit:1}],
  communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: 1
});

run("72o vs 1 opponent  (published: ~34%)", {
  playerCards: [{rank:7,suit:0},{rank:2,suit:1}],
  communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: 1
});

console.log('\n=== AA vs multiple opponents (equity drops as table fills) ===');
for (const opp of [1, 2, 3, 4, 5]) {
  run(`AA preflop vs ${opp} opponent${opp>1?'s':''}`, {
    playerCards: [{rank:14,suit:0},{rank:14,suit:1}],
    communityCards: [], communityNeeded: 5, oppCardCount: 2, sharedCommunity: true, numOpponents: opp
  });
}

console.log('\n=== HAND STRENGTH — 5-card draw, vs 3 opponents ===');
const hands5 = [
  ['Straight flush (9-high)',  [{rank:9,suit:1},{rank:8,suit:1},{rank:7,suit:1},{rank:6,suit:1},{rank:5,suit:1}]],
  ['Full house KKK-99',        [{rank:13,suit:0},{rank:13,suit:1},{rank:13,suit:2},{rank:9,suit:0},{rank:9,suit:1}]],
  ['Flush A-high',             [{rank:14,suit:2},{rank:10,suit:2},{rank:8,suit:2},{rank:5,suit:2},{rank:3,suit:2}]],
  ['Straight (T-high)',        [{rank:10,suit:0},{rank:9,suit:1},{rank:8,suit:2},{rank:7,suit:3},{rank:6,suit:0}]],
  ['Three of a kind, 7s',      [{rank:7,suit:0},{rank:7,suit:1},{rank:7,suit:2},{rank:14,suit:3},{rank:13,suit:0}]],
  ['Two pair, A and K',        [{rank:14,suit:0},{rank:14,suit:1},{rank:13,suit:2},{rank:13,suit:3},{rank:12,suit:0}]],
  ['One pair, Aces',           [{rank:14,suit:0},{rank:14,suit:1},{rank:12,suit:2},{rank:10,suit:3},{rank:8,suit:0}]],
  ['High card, A-K',           [{rank:14,suit:0},{rank:13,suit:1},{rank:10,suit:2},{rank:7,suit:3},{rank:2,suit:0}]],
];
for (const [label, cards] of hands5) {
  run(label, { playerCards: cards, communityCards: [], communityNeeded: 0, oppCardCount: 5, sharedCommunity: false, numOpponents: 3 });
}

console.log('');
