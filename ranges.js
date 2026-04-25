// Run with: node ranges.js
// Computes win% ranges for each hand rank across low/mid/high examples, per game mode.

eval(require('fs').readFileSync('js/deck.js','utf8'));
eval(require('fs').readFileSync('js/evaluator.js','utf8'));
eval(require('fs').readFileSync('js/simulator.js','utf8'));

const SIMS = 4000;
const OPPS = 5;

function run(playerCards, communityCards, communityNeeded, oppCardCount, sharedCommunity) {
  return simulate({ playerCards, communityCards: communityCards||[], communityNeeded: communityNeeded||0,
    oppCardCount, sharedCommunity: sharedCommunity||false, numOpponents: OPPS, numSims: SIMS }).winPct;
}

const hands5 = {
  'High Card':        [
    [{rank:7,suit:0},{rank:2,suit:1},{rank:9,suit:2},{rank:4,suit:3},{rank:11,suit:0}],
    [{rank:10,suit:0},{rank:7,suit:1},{rank:4,suit:2},{rank:2,suit:3},{rank:13,suit:0}],
    [{rank:14,suit:0},{rank:13,suit:1},{rank:10,suit:2},{rank:7,suit:3},{rank:2,suit:0}],
  ],
  'One Pair':         [
    [{rank:2,suit:0},{rank:2,suit:1},{rank:7,suit:2},{rank:9,suit:3},{rank:11,suit:0}],
    [{rank:8,suit:0},{rank:8,suit:1},{rank:2,suit:2},{rank:5,suit:3},{rank:11,suit:0}],
    [{rank:14,suit:0},{rank:14,suit:1},{rank:2,suit:2},{rank:5,suit:3},{rank:9,suit:0}],
  ],
  'Two Pair':         [
    [{rank:2,suit:0},{rank:2,suit:1},{rank:3,suit:2},{rank:3,suit:3},{rank:7,suit:0}],
    [{rank:8,suit:0},{rank:8,suit:1},{rank:9,suit:2},{rank:9,suit:3},{rank:2,suit:0}],
    [{rank:14,suit:0},{rank:14,suit:1},{rank:13,suit:2},{rank:13,suit:3},{rank:2,suit:0}],
  ],
  'Three of a Kind':  [
    [{rank:2,suit:0},{rank:2,suit:1},{rank:2,suit:2},{rank:4,suit:3},{rank:6,suit:0}],
    [{rank:8,suit:0},{rank:8,suit:1},{rank:8,suit:2},{rank:2,suit:3},{rank:5,suit:0}],
    [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:2,suit:3},{rank:5,suit:0}],
  ],
  'Straight':         [
    [{rank:5,suit:0},{rank:4,suit:1},{rank:3,suit:2},{rank:2,suit:3},{rank:14,suit:0}],
    [{rank:9,suit:0},{rank:8,suit:1},{rank:7,suit:2},{rank:6,suit:3},{rank:5,suit:0}],
    [{rank:14,suit:0},{rank:13,suit:1},{rank:12,suit:2},{rank:11,suit:3},{rank:10,suit:0}],
  ],
  'Flush':            [
    [{rank:7,suit:0},{rank:5,suit:0},{rank:4,suit:0},{rank:3,suit:0},{rank:2,suit:0}],
    [{rank:10,suit:0},{rank:8,suit:0},{rank:6,suit:0},{rank:4,suit:0},{rank:2,suit:0}],
    [{rank:14,suit:0},{rank:10,suit:0},{rank:8,suit:0},{rank:5,suit:0},{rank:3,suit:0}],
  ],
  'Full House':       [
    [{rank:2,suit:0},{rank:2,suit:1},{rank:2,suit:2},{rank:3,suit:3},{rank:3,suit:0}],
    [{rank:8,suit:0},{rank:8,suit:1},{rank:8,suit:2},{rank:9,suit:3},{rank:9,suit:0}],
    [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:13,suit:3},{rank:13,suit:0}],
  ],
  'Four of a Kind':   [
    [{rank:2,suit:0},{rank:2,suit:1},{rank:2,suit:2},{rank:2,suit:3},{rank:3,suit:0}],
    [{rank:8,suit:0},{rank:8,suit:1},{rank:8,suit:2},{rank:8,suit:3},{rank:9,suit:0}],
    [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:14,suit:3},{rank:13,suit:0}],
  ],
  'Straight Flush':   [
    [{rank:5,suit:0},{rank:4,suit:0},{rank:3,suit:0},{rank:2,suit:0},{rank:14,suit:0}],
    [{rank:9,suit:0},{rank:8,suit:0},{rank:7,suit:0},{rank:6,suit:0},{rank:5,suit:0}],
    [{rank:14,suit:0},{rank:13,suit:0},{rank:12,suit:0},{rank:11,suit:0},{rank:10,suit:0}],
  ],
};

const stud7hands = {
  'High Card':       [[{rank:7,suit:0},{rank:2,suit:1},{rank:9,suit:2},{rank:4,suit:3},{rank:11,suit:0},{rank:13,suit:1},{rank:3,suit:2}],
                      [{rank:14,suit:0},{rank:10,suit:1},{rank:6,suit:2},{rank:3,suit:3},{rank:9,suit:0},{rank:7,suit:1},{rank:2,suit:2}]],
  'One Pair':        [[{rank:2,suit:0},{rank:2,suit:1},{rank:5,suit:2},{rank:7,suit:3},{rank:9,suit:0},{rank:11,suit:1},{rank:4,suit:2}],
                      [{rank:14,suit:0},{rank:14,suit:1},{rank:2,suit:2},{rank:4,suit:3},{rank:6,suit:0},{rank:8,suit:1},{rank:10,suit:2}]],
  'Two Pair':        [[{rank:2,suit:0},{rank:2,suit:1},{rank:3,suit:2},{rank:3,suit:3},{rank:5,suit:0},{rank:7,suit:1},{rank:9,suit:2}],
                      [{rank:14,suit:0},{rank:14,suit:1},{rank:13,suit:2},{rank:13,suit:3},{rank:2,suit:0},{rank:4,suit:1},{rank:6,suit:2}]],
  'Three of a Kind': [[{rank:2,suit:0},{rank:2,suit:1},{rank:2,suit:2},{rank:4,suit:3},{rank:6,suit:0},{rank:8,suit:1},{rank:10,suit:2}],
                      [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:2,suit:3},{rank:4,suit:0},{rank:6,suit:1},{rank:8,suit:2}]],
  'Straight':        [[{rank:5,suit:0},{rank:4,suit:1},{rank:3,suit:2},{rank:2,suit:3},{rank:14,suit:0},{rank:9,suit:1},{rank:11,suit:2}],
                      [{rank:14,suit:0},{rank:13,suit:1},{rank:12,suit:2},{rank:11,suit:3},{rank:10,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  'Flush':           [[{rank:7,suit:0},{rank:5,suit:0},{rank:4,suit:0},{rank:3,suit:0},{rank:2,suit:0},{rank:9,suit:1},{rank:11,suit:2}],
                      [{rank:14,suit:0},{rank:10,suit:0},{rank:8,suit:0},{rank:5,suit:0},{rank:3,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  'Full House':      [[{rank:2,suit:0},{rank:2,suit:1},{rank:2,suit:2},{rank:3,suit:3},{rank:3,suit:0},{rank:5,suit:1},{rank:7,suit:2}],
                      [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:13,suit:3},{rank:13,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  'Four of a Kind':  [[{rank:2,suit:0},{rank:2,suit:1},{rank:2,suit:2},{rank:2,suit:3},{rank:4,suit:0},{rank:6,suit:1},{rank:8,suit:2}],
                      [{rank:14,suit:0},{rank:14,suit:1},{rank:14,suit:2},{rank:14,suit:3},{rank:2,suit:0},{rank:4,suit:1},{rank:6,suit:2}]],
  'Straight Flush':  [[{rank:5,suit:0},{rank:4,suit:0},{rank:3,suit:0},{rank:2,suit:0},{rank:14,suit:0},{rank:7,suit:1},{rank:9,suit:2}],
                      [{rank:14,suit:0},{rank:13,suit:0},{rank:12,suit:0},{rank:11,suit:0},{rank:10,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
};

// Hold'em: hole cards + full 5-card board, no more community needed
// Format: [holeCards, communityCards]
const holdemRiver = {
  'High Card':        [
    [[{rank:7,suit:0},{rank:2,suit:1}], [{rank:9,suit:2},{rank:4,suit:3},{rank:11,suit:0},{rank:13,suit:1},{rank:3,suit:2}]],
    [[{rank:10,suit:0},{rank:6,suit:1}], [{rank:2,suit:2},{rank:5,suit:3},{rank:9,suit:0},{rank:13,suit:1},{rank:3,suit:2}]],
    [[{rank:14,suit:0},{rank:9,suit:1}], [{rank:2,suit:2},{rank:5,suit:3},{rank:7,suit:0},{rank:10,suit:1},{rank:3,suit:2}]],
  ],
  'One Pair':         [
    [[{rank:2,suit:0},{rank:2,suit:1}], [{rank:7,suit:2},{rank:9,suit:3},{rank:11,suit:0},{rank:13,suit:1},{rank:3,suit:2}]],
    [[{rank:8,suit:0},{rank:8,suit:1}], [{rank:2,suit:2},{rank:5,suit:3},{rank:11,suit:0},{rank:13,suit:1},{rank:3,suit:2}]],
    [[{rank:14,suit:0},{rank:14,suit:1}], [{rank:2,suit:2},{rank:5,suit:3},{rank:9,suit:0},{rank:10,suit:1},{rank:3,suit:2}]],
  ],
  'Two Pair':         [
    [[{rank:2,suit:0},{rank:3,suit:1}], [{rank:2,suit:2},{rank:3,suit:3},{rank:7,suit:0},{rank:10,suit:1},{rank:5,suit:2}]],
    [[{rank:8,suit:0},{rank:9,suit:1}], [{rank:8,suit:2},{rank:9,suit:3},{rank:2,suit:0},{rank:5,suit:1},{rank:11,suit:2}]],
    [[{rank:14,suit:0},{rank:13,suit:1}], [{rank:14,suit:2},{rank:13,suit:3},{rank:2,suit:0},{rank:5,suit:1},{rank:7,suit:2}]],
  ],
  'Three of a Kind':  [
    [[{rank:2,suit:0},{rank:2,suit:1}], [{rank:2,suit:2},{rank:5,suit:3},{rank:9,suit:0},{rank:11,suit:1},{rank:3,suit:2}]],
    [[{rank:8,suit:0},{rank:8,suit:1}], [{rank:8,suit:2},{rank:2,suit:3},{rank:5,suit:0},{rank:11,suit:1},{rank:3,suit:2}]],
    [[{rank:14,suit:0},{rank:14,suit:1}], [{rank:14,suit:2},{rank:2,suit:3},{rank:5,suit:0},{rank:9,suit:1},{rank:3,suit:2}]],
  ],
  'Straight':         [
    [[{rank:5,suit:0},{rank:4,suit:1}], [{rank:3,suit:2},{rank:2,suit:3},{rank:14,suit:0},{rank:9,suit:1},{rank:11,suit:2}]],
    [[{rank:9,suit:0},{rank:8,suit:1}], [{rank:7,suit:2},{rank:6,suit:3},{rank:5,suit:0},{rank:2,suit:1},{rank:11,suit:2}]],
    [[{rank:14,suit:0},{rank:13,suit:1}], [{rank:12,suit:2},{rank:11,suit:3},{rank:10,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  ],
  'Flush':            [
    [[{rank:7,suit:0},{rank:5,suit:0}], [{rank:4,suit:0},{rank:3,suit:0},{rank:2,suit:0},{rank:9,suit:1},{rank:11,suit:2}]],
    [[{rank:10,suit:0},{rank:8,suit:0}], [{rank:6,suit:0},{rank:4,suit:0},{rank:2,suit:0},{rank:9,suit:1},{rank:11,suit:2}]],
    [[{rank:14,suit:0},{rank:10,suit:0}], [{rank:8,suit:0},{rank:5,suit:0},{rank:3,suit:0},{rank:9,suit:1},{rank:11,suit:2}]],
  ],
  'Full House':       [
    [[{rank:2,suit:0},{rank:2,suit:1}], [{rank:2,suit:2},{rank:3,suit:3},{rank:3,suit:0},{rank:5,suit:1},{rank:7,suit:2}]],
    [[{rank:8,suit:0},{rank:8,suit:1}], [{rank:8,suit:2},{rank:9,suit:3},{rank:9,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
    [[{rank:14,suit:0},{rank:14,suit:1}], [{rank:14,suit:2},{rank:13,suit:3},{rank:13,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  ],
  'Four of a Kind':   [
    [[{rank:2,suit:0},{rank:2,suit:1}], [{rank:2,suit:2},{rank:2,suit:3},{rank:5,suit:0},{rank:9,suit:1},{rank:11,suit:2}]],
    [[{rank:8,suit:0},{rank:8,suit:1}], [{rank:8,suit:2},{rank:8,suit:3},{rank:9,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
    [[{rank:14,suit:0},{rank:14,suit:1}], [{rank:14,suit:2},{rank:14,suit:3},{rank:13,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  ],
  'Straight Flush':   [
    [[{rank:5,suit:0},{rank:4,suit:0}], [{rank:3,suit:0},{rank:2,suit:0},{rank:14,suit:0},{rank:9,suit:1},{rank:11,suit:2}]],
    [[{rank:9,suit:0},{rank:8,suit:0}], [{rank:7,suit:0},{rank:6,suit:0},{rank:5,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
    [[{rank:14,suit:0},{rank:13,suit:0}], [{rank:12,suit:0},{rank:11,suit:0},{rank:10,suit:0},{rank:2,suit:1},{rank:4,suit:2}]],
  ],
};

console.log('\n=== 5-STUD / 5-DRAW (5 cards, 5 opponents) ===');
for (const [name, examples] of Object.entries(hands5)) {
  const pcts = examples.map(h => run(h, [], 0, 5, false));
  console.log(`${name.padEnd(18)} ${String(Math.min(...pcts)).padStart(3)}-${String(Math.max(...pcts)).padStart(3)}%  (${pcts.join(', ')})`);
}

console.log('\n=== 7-STUD (7 cards best-5, 5 opponents) ===');
for (const [name, examples] of Object.entries(stud7hands)) {
  const pcts = examples.map(h => run(h, [], 0, 7, false));
  console.log(`${name.padEnd(18)} ${String(Math.min(...pcts)).padStart(3)}-${String(Math.max(...pcts)).padStart(3)}%  (${pcts.join(', ')})`);
}

console.log('\n=== HOLD\'EM river (hole + full board, 5 opponents) ===');
for (const [name, examples] of Object.entries(holdemRiver)) {
  const pcts = examples.map(([hole, comm]) => run(hole, comm, 0, 2, true));
  console.log(`${name.padEnd(18)} ${String(Math.min(...pcts)).padStart(3)}-${String(Math.max(...pcts)).padStart(3)}%  (${pcts.join(', ')})`);
}
