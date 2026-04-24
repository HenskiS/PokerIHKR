// Card representation: { rank: 2-14, suit: 0-3 }
// Suits: 0=Spades, 1=Hearts, 2=Diamonds, 3=Clubs

const SUIT_SYM   = ['♠', '♥', '♦', '♣'];
const SUIT_NAME  = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

const RANK_SYM   = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A' };
const RANK_WORD  = { 2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine',10:'Ten',11:'Jack',12:'Queen',13:'King',14:'Ace' };
const RANK_PLURAL= { 2:'Twos',3:'Threes',4:'Fours',5:'Fives',6:'Sixes',7:'Sevens',8:'Eights',9:'Nines',10:'Tens',11:'Jacks',12:'Queens',13:'Kings',14:'Aces' };

function createDeck() {
  const cards = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 2; rank <= 14; rank++) {
      cards.push({ rank, suit });
    }
  }
  return cards;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function isRed(card) {
  return card.suit === 1 || card.suit === 2; // hearts or diamonds
}

function cardKey(card) {
  return `${card.rank}-${card.suit}`;
}
