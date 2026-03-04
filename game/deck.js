// =============================================
// BARAJA Y EVALUADOR DE MANOS
// =============================================

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit, value: RANK_VALUES[rank] });
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Evalúa las cartas disponibles — devuelve { rank (0-8), name, best5 }
function evaluateHand(cards) {
  if (!cards || cards.length === 0) return { score: { rank: -1, name: 'Sin cartas', vals: [] }, cards: [] };
  
  // Si hay menos de 5 cartas, evaluar con las que hay
  const k = Math.min(5, cards.length);
  const combos = getCombinations(cards, k);
  let best = null;
  for (const combo of combos) {
    const score = scoreHand(combo);
    if (!best || compareScore(score, best.score) > 0)
      best = { score, cards: combo };
  }
  return best || { score: { rank: -1, name: 'Carta Alta', vals: [] }, cards: [] };
}

function getCombinations(arr, k) {
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(x => [x]);
  const result = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = getCombinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) result.push([arr[i], ...combo]);
  }
  return result;
}

function scoreHand(cards) {
  const vals = cards.map(c => c.value).sort((a,b) => b - a);
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => c.rank);

  const isFlush = new Set(suits).size === 1;
  const isStraight = checkStraight(vals);
  const counts = countValues(vals);
  const groups = Object.values(counts).sort((a,b) => b - a);

  if (isFlush && isStraight && vals[0] === 14) return { rank: 8, name: 'Escalera Real', vals };
  if (isFlush && isStraight) return { rank: 7, name: 'Escalera de Color', vals };
  if (groups[0] === 4) return { rank: 6, name: 'Poker', vals };
  if (groups[0] === 3 && groups[1] === 2) return { rank: 5, name: 'Full House', vals };
  if (isFlush) return { rank: 4, name: 'Color', vals };
  if (isStraight) return { rank: 3, name: 'Escalera', vals };
  if (groups[0] === 3) return { rank: 2, name: 'Trío', vals };
  if (groups[0] === 2 && groups[1] === 2) return { rank: 1, name: 'Doble Par', vals };
  if (groups[0] === 2) return { rank: 0, name: 'Par', vals };
  return { rank: -1, name: 'Carta Alta', vals };
}

function checkStraight(vals) {
  const unique = [...new Set(vals)].sort((a,b) => b - a);
  if (unique.length < 5) return false;
  // Normal straight
  if (unique[0] - unique[4] === 4) return true;
  // Wheel (A-2-3-4-5)
  if (JSON.stringify(unique) === JSON.stringify([14,5,4,3,2])) return true;
  return false;
}

function countValues(vals) {
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  return counts;
}

function compareScore(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < a.vals.length; i++) {
    if (a.vals[i] !== b.vals[i]) return a.vals[i] - b.vals[i];
  }
  return 0;
}

module.exports = { createDeck, shuffle, evaluateHand, compareScore };
