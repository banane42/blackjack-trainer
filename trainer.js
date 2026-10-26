'use strict';

// ---------------------------------------------------------------------------
// Strategy chart (transcribed from strategy-table.html).
// Columns are dealer upcards 2,3,4,5,6,7,8,9,10,A.
// ---------------------------------------------------------------------------
const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

const CHART = [
  { section: 'Hard totals (excluding pairs)', category: 'hard', rows: [
    { key: 'h18', label: '18–21', codes: 'S S S S S S S S S S' },
    { key: 'h17', label: '17',    codes: 'S S S S S S S S S Us' },
    { key: 'h16', label: '16',    codes: 'S S S S S H H Uh Uh Uh' },
    { key: 'h15', label: '15',    codes: 'S S S S S H H H Uh Uh' },
    { key: 'h13', label: '13–14', codes: 'S S S S S H H H H H' },
    { key: 'h12', label: '12',    codes: 'H H S S S H H H H H' },
    { key: 'h11', label: '11',    codes: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh Dh' },
    { key: 'h10', label: '10',    codes: 'Dh Dh Dh Dh Dh Dh Dh Dh H H' },
    { key: 'h9',  label: '9',     codes: 'H Dh Dh Dh Dh H H H H H' },
    { key: 'h5',  label: '5–8',   codes: 'H H H H H H H H H H' },
  ]},
  { section: 'Soft totals', category: 'soft', rows: [
    { key: 'sA9', label: 'A,9',     codes: 'S S S S S S S S S S' },
    { key: 'sA8', label: 'A,8',     codes: 'S S S S Ds S S S S S' },
    { key: 'sA7', label: 'A,7',     codes: 'Ds Ds Ds Ds Ds S S H H H' },
    { key: 'sA6', label: 'A,6',     codes: 'H Dh Dh Dh Dh H H H H H' },
    { key: 'sA4', label: 'A,4–A,5', codes: 'H H Dh Dh Dh H H H H H' },
    { key: 'sA2', label: 'A,2–A,3', codes: 'H H H Dh Dh H H H H H' },
    { key: 'sAA', label: 'A,A',     codes: 'H H H H Dh H H H H H' },
  ]},
  { section: 'Pairs', category: 'pair', rows: [
    { key: 'pA',  label: 'A,A',     codes: 'SP SP SP SP SP SP SP SP SP SP' },
    { key: 'pT',  label: '10,10',   codes: 'S S S S S S S S S S' },
    { key: 'p9',  label: '9,9',     codes: 'SP SP SP SP SP S SP SP S S' },
    { key: 'p8',  label: '8,8',     codes: 'SP SP SP SP SP SP SP SP SP Usp' },
    { key: 'p7',  label: '7,7',     codes: 'SP SP SP SP SP SP H H H H' },
    { key: 'p6',  label: '6,6',     codes: 'SP SP SP SP SP H H H H H' },
    { key: 'p5',  label: '5,5',     codes: 'Dh Dh Dh Dh Dh Dh Dh Dh H H' },
    { key: 'p4',  label: '4,4',     codes: 'H H H SP SP H H H H H' },
    { key: 'p2',  label: '2,2–3,3', codes: 'SP SP SP SP SP SP H H H H' },
  ]},
];

const ROWS = {};
const CATEGORY_ACTIONS = {}; // category -> actions its chart can resolve to, in ACTION_NAMES order
const CODE_ACTIONS = { S: 'S', H: 'H', Dh: 'DH', Ds: 'DS', SP: 'P', Uh: 'RH', Us: 'RS', Usp: 'RP' };
for (const sec of CHART) {
  const acts = new Set();
  for (const row of sec.rows) {
    row.codes = row.codes.split(' ');
    row.category = sec.category;
    ROWS[row.key] = row;
    for (const code of row.codes) for (const a of CODE_ACTIONS[code]) acts.add(a);
  }
  CATEGORY_ACTIONS[sec.category] = 'HSDPR'.split('').filter(a => acts.has(a));
}

const ACTION_NAMES = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
const CODE_TEXT = {
  S: 'Stand', H: 'Hit', Dh: 'Double (else hit)', Ds: 'Double (else stand)',
  SP: 'Split', Uh: 'Surrender (else hit)', Us: 'Surrender (else stand)', Usp: 'Surrender (else split)',
};

function hardKey(t) {
  if (t >= 18) return 'h18';
  if (t >= 13 && t <= 17) return t === 17 ? 'h17' : t === 16 ? 'h16' : t === 15 ? 'h15' : 'h13';
  if (t >= 9 && t <= 12) return 'h' + t;
  return 'h5';
}
function softKey(t) {
  if (t >= 20) return 'sA9';
  if (t === 19) return 'sA8';
  if (t === 18) return 'sA7';
  if (t === 17) return 'sA6';
  if (t >= 15) return 'sA4';
  if (t >= 13) return 'sA2';
  return 'sAA';
}
function pairKey(v) {
  if (v === 11) return 'pA';
  if (v === 10) return 'pT';
  if (v <= 3) return 'p2';
  return 'p' + v;
}

// Turn a chart code into a concrete action given what is legal right now.
function resolveCode(code, ctx) {
  switch (code) {
    case 'S': return 'S';
    case 'H': return 'H';
    case 'Dh': return ctx.canDouble ? 'D' : 'H';
    case 'Ds': return ctx.canDouble ? 'D' : 'S';
    case 'SP': return 'P';
    case 'Uh': return ctx.canSurrender ? 'R' : 'H';
    case 'Us': return ctx.canSurrender ? 'R' : 'S';
    case 'Usp': return ctx.canSurrender ? 'R' : 'P';
  }
  throw new Error('Unknown code ' + code);
}

// Returns { rowKey, col, code, action } for the given hand vs dealer upcard.
function strategyFor(hand, upcard, ctx) {
  const col = upcard.value === 11 ? 9 : upcard.value - 2;
  const { total, soft } = handValue(hand.cards);
  let rowKey;
  if (ctx.canSplit) rowKey = pairKey(hand.cards[0].value);
  else if (soft) rowKey = softKey(total);
  else rowKey = hardKey(total);
  const code = ROWS[rowKey].codes[col];
  return { rowKey, col, code, action: resolveCode(code, ctx) };
}

// ---------------------------------------------------------------------------
// Cards & shoe
// ---------------------------------------------------------------------------
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♣', '♦', '♠', '♥']; // spritesheet row order
const DECKS = 6;
const CUT_REMAINING = Math.floor(52 * DECKS * 0.25);

function makeCard(rank, suit) {
  const value = rank === 0 ? 11 : rank >= 9 ? 10 : rank + 1;
  return { rank, suit, value, label: RANKS[rank] + SUITS[suit] };
}

function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++)
    for (let s = 0; s < 4; s++)
      for (let r = 0; r < 13; r++) shoe.push(makeCard(r, s));
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += c.value; if (c.value === 11) aces++; }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

function describeHand(cards) {
  const { total, soft } = handValue(cards);
  if (cards.length === 2 && cards[0].value === cards[1].value) {
    const r = c => (c.value === 11 ? 'A' : c.value);
    return `Pair ${r(cards[0])},${r(cards[1])}`;
  }
  return `${soft ? 'Soft' : 'Hard'} ${total}`;
}

// ---------------------------------------------------------------------------
// Stats (persisted)
// ---------------------------------------------------------------------------
const STORE_KEY = 'bjtrainer.v1';
function freshActs() {
  return { H: { n: 0, c: 0 }, S: { n: 0, c: 0 }, D: { n: 0, c: 0 }, P: { n: 0, c: 0 }, R: { n: 0, c: 0 } };
}
function freshCat() { return { n: 0, c: 0, acts: freshActs() }; }
function freshStats() {
  return {
    decisions: 0, correct: 0, streak: 0, best: 0, hands: 0, won: 0,
    cats: { hard: freshCat(), soft: freshCat(), pair: freshCat() }, // each with per-action `acts`
    cells: {},     // "rowKey:col" -> { n, miss }
    mistakes: [],  // newest first
  };
}
function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && s.cats) {
      if (typeof s.won !== 'number') s.won = 0; // older saves tracked units in `net`
      delete s.net;
      delete s.acts; // briefly tracked overall per-action stats; now per category only
      for (const k in s.cats) if (!s.cats[k].acts) s.cats[k].acts = freshActs();
      return s;
    }
  } catch (e) { /* ignore */ }
  return freshStats();
}
function saveStats() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
}

let stats = loadStats();

// ---------------------------------------------------------------------------
// Bank (persisted separately so resetting stats keeps your money)
// ---------------------------------------------------------------------------
const BANK_KEY = 'bjtrainer.bank.v1';
const STARTING_BANK = 1000;
function loadBank() {
  try {
    const b = JSON.parse(localStorage.getItem(BANK_KEY));
    if (b && typeof b.bank === 'number') return b;
  } catch (e) { /* ignore */ }
  return { bank: STARTING_BANK, bet: 25 };
}
function saveBank() {
  try { localStorage.setItem(BANK_KEY, JSON.stringify(wallet)); } catch (e) { /* ignore */ }
}
const wallet = loadBank();

function money(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + '$' + (Number.isInteger(abs) ? abs : abs.toFixed(2));
}

function addChip(amount) {
  if (state.phase === 'player' || state.phase === 'dealer') return;
  wallet.bet = Math.min(wallet.bet + amount, wallet.bank);
  Sound.play('chip');
  saveBank();
  render();
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const OPTS_KEY = 'bjtrainer.opts.v1';
// practice: 'hard' deals normally; 'soft' / 'pair' bias the player's first two cards toward that hand type.
const opts = { surrender: true, h17: true, animate: true, showTotals: true, practice: 'hard' };
const PRACTICE_BIAS = 0.75; // chance a biased deal is forced; the rest stay random so the hand type isn't a given
const PAIR_EASY_WEIGHT = 0.4; // relative odds of a forced 10-10 or A-A vs. each of 2-2 … 9-9
try {
  const o = JSON.parse(localStorage.getItem(OPTS_KEY));
  if (o) for (const k in opts) if (typeof o[k] === typeof opts[k]) opts[k] = o[k];
  if (!['hard', 'soft', 'pair'].includes(opts.practice)) opts.practice = 'hard';
} catch (e) { /* ignore */ }
function saveOpts() {
  try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch (e) { /* ignore */ }
}
const state = {
  shoe: newShoe(),
  dealer: [],
  hands: [],
  active: 0,
  phase: 'idle', // idle | player | dealer | done
  holeHidden: true,
  lastCell: null,
  correction: null, // details of the most recent wrong decision, cleared by the next correct one
  outcome: null,    // 'won' | 'lost' | 'push' | null (round in progress)
  peeked: false,    // strategy chart was open during this round: its decisions don't count
};

function draw() {
  if (!state.shoe.length) state.shoe = newShoe();
  return state.shoe.pop();
}

// A made-up card (any rank/suit equally likely) matching pred. Forced practice hands use these rather than
// pulling from the shoe, which would drain its aces and low cards and skew every later deal toward tens.
function randomCard(pred) {
  for (;;) {
    const c = makeCard(Math.floor(Math.random() * 13), Math.floor(Math.random() * 4));
    if (pred(c)) return c;
  }
}

// The player's opening two cards, biased toward opts.practice. A normal deal is drawn first and kept if it's
// already a pair or has an ace (soft, or a natural), so the other practice type still shows up at its usual
// rate; only plain hard hands get swapped for the practiced type (they're burned, not returned, so the shoe
// keeps its normal mix). Soft hands avoid A-10 (a natural, no decision).
function playerOpening() {
  const cards = [draw(), draw()];
  const pair = cards[0].value === cards[1].value;
  // In pair practice a dealt 10-10 / A-A is swappable too, so those stay rare (see PAIR_EASY_WEIGHT).
  const easyPair = pair && opts.practice === 'pair' && cards[0].value >= 10;
  const special = (pair || cards.some(c => c.value === 11)) && !easyPair;
  if (opts.practice === 'hard' || special || Math.random() >= PRACTICE_BIAS) return cards;
  if (opts.practice === 'pair') {
    // 10-10 (always stand) and A-A (always split) teach little, so forced pairs pick each of 2–9 equally and
    // 10s/aces at PAIR_EASY_WEIGHT of that; otherwise 10-values would be 4 of every 13 pairs.
    let roll = Math.random() * (8 + 2 * PAIR_EASY_WEIGHT);
    const value = roll < 8 ? 2 + Math.floor(roll) : (roll -= 8) < PAIR_EASY_WEIGHT ? 10 : 11;
    const first = randomCard(c => c.value === value);
    return [first, randomCard(c => c.value === value)];
  }
  const soft = [randomCard(c => c.value === 11), randomCard(c => c.value >= 2 && c.value <= 9)];
  return Math.random() < 0.5 ? soft : soft.reverse();
}

function currentHand() { return state.hands[state.active]; }

function isPair(hand) {
  return hand.cards.length === 2 && hand.cards[0].value === hand.cards[1].value;
}

function context(hand) {
  const firstTwo = hand.cards.length === 2;
  const canAfford = wallet.bank >= hand.bet;
  return {
    canDouble: firstTwo && canAfford, // double after split allowed
    canSplit: isPair(hand) && state.hands.length < 4 && canAfford,
    canSurrender: opts.surrender && firstTwo && state.hands.length === 1 && !hand.fromSplit,
  };
}

function allowed(action, hand, ctx) {
  switch (action) {
    case 'H': case 'S': return true;
    case 'D': return ctx.canDouble;
    case 'P': return ctx.canSplit;
    case 'R': return ctx.canSurrender;
  }
  return false;
}

function deal() {
  if (state.phase === 'player' || state.phase === 'dealer') return;
  if (wallet.bet > wallet.bank) wallet.bet = wallet.bank;
  if (wallet.bet <= 0) {
    setFeedback('neutral', wallet.bank > 0 ? 'Place a bet first.' : 'You are out of money.',
      wallet.bank > 0 ? 'Click the chips to build your bet.' : 'Use "Reset bank" in Options to rebuy.');
    render();
    return;
  }
  let shuffled = false;
  if (state.shoe.length < CUT_REMAINING) { state.shoe = newShoe(); shuffled = true; }

  wallet.bank -= wallet.bet;
  saveBank();
  state.correction = null;
  state.outcome = null;
  state.peeked = $('chart-panel').open;
  state.hands = [{ cards: playerOpening(), bet: wallet.bet, done: false, fromSplit: false, result: null }];
  state.dealer = [draw(), draw()];
  state.active = 0;
  state.holeHidden = true;
  state.phase = 'player';
  stats.hands++;
  if (shuffled) Sound.play('shuffle');
  const dealAt = shuffled ? 0.45 : 0;
  Sound.play('chip', dealAt);
  for (let i = 0; i < 4; i++) Sound.play('card', dealAt + 0.12 + i * 0.12);

  const up = state.dealer[0];
  const dealerBJ = handValue(state.dealer).total === 21;
  const playerBJ = handValue(state.hands[0].cards).total === 21;

  if (up.value >= 10 && dealerBJ) {
    setFeedback('neutral', 'Dealer has blackjack.', 'No decision this hand.');
    Sound.play('flip', dealAt + 0.7);
    finishRound(dealAt + 0.9);
  } else if (playerBJ) {
    setFeedback('neutral', 'Blackjack!', 'No decision needed.');
    Sound.play('flip', dealAt + 0.7);
    finishRound(dealAt + 0.9);
  } else {
    setFeedback('neutral', shuffled ? 'New shoe shuffled. Your move.' : 'Your move.', promptText());
    render();
  }
}

function promptText() {
  const hand = currentHand();
  const prefix = state.hands.length > 1 ? `Hand ${state.active + 1}: ` : '';
  const desc = opts.showTotals ? describeHand(hand.cards) : hand.cards.map(c => RANKS[c.rank]).join(', ');
  return `${prefix}${desc} vs dealer ${RANKS[state.dealer[0].rank]}`;
}

function act(action) {
  if (state.phase !== 'player') return;
  const hand = currentHand();
  const ctx = context(hand);
  if (!allowed(action, hand, ctx)) return;

  recordDecision(hand, ctx, action);

  switch (action) {
    case 'H':
      Sound.play('card', 0.1);
      hand.cards.push(draw());
      if (handValue(hand.cards).total >= 21) hand.done = true;
      break;
    case 'S':
      hand.done = true;
      break;
    case 'D':
      Sound.play('chip', 0.1);
      Sound.play('card', 0.25);
      wallet.bank -= hand.bet;
      hand.bet *= 2;
      hand.cards.push(draw());
      hand.done = true;
      break;
    case 'R':
      hand.surrendered = true;
      hand.done = true;
      break;
    case 'P': {
      const splitAces = hand.cards[0].value === 11;
      Sound.play('chip', 0.1);
      Sound.play('card', 0.25);
      Sound.play('card', 0.4);
      wallet.bank -= hand.bet;
      const second = { cards: [hand.cards.pop()], bet: hand.bet, done: false, fromSplit: true, result: null };
      hand.fromSplit = true;
      hand.cards.push(draw());
      second.cards.push(draw());
      state.hands.splice(state.active + 1, 0, second);
      for (const h of [hand, second]) {
        // Split aces receive one card only.
        if (splitAces || handValue(h.cards).total === 21) h.done = true;
      }
      break;
    }
  }
  saveBank();
  advance();
}

function advance() {
  while (state.active < state.hands.length && state.hands[state.active].done) state.active++;
  if (state.active < state.hands.length) {
    render();
    return;
  }
  dealerTurn();
}

function dealerTurn() {
  state.phase = 'dealer';
  state.holeHidden = false;
  Sound.play('flip', 0.15);
  render();
  const live = state.hands.some(h => !h.surrendered && handValue(h.cards).total <= 21);
  const step = () => {
    const { total, soft } = handValue(state.dealer);
    const mustHit = live && (total < 17 || (opts.h17 && total === 17 && soft));
    if (!mustHit) { finishRound(); return; }
    Sound.play('card');
    state.dealer.push(draw());
    render();
    if (opts.animate) setTimeout(step, 550); else step();
  };
  if (opts.animate) setTimeout(step, 450); else step();
}

// soundDelay: seconds to wait before the outcome sound, so it follows the card sounds.
function finishRound(soundDelay = 0.3) {
  state.phase = 'done';
  state.holeHidden = false;
  const d = handValue(state.dealer).total;
  const dealerBJ = d === 21 && state.dealer.length === 2;
  let roundDelta = 0;

  for (const h of state.hands) {
    const p = handValue(h.cards).total;
    const natural = p === 21 && h.cards.length === 2 && state.hands.length === 1;
    let delta;
    if (h.surrendered) { delta = -h.bet / 2; h.result = ['lose', 'Surrendered']; }
    else if (natural && !dealerBJ) { delta = h.bet * 1.5; h.result = ['win', 'Blackjack +1.5']; }
    else if (dealerBJ && !natural) { delta = -h.bet; h.result = ['lose', 'Dealer BJ']; }
    else if (p > 21) { delta = -h.bet; h.result = ['lose', 'Bust']; }
    else if (d > 21 || p > d) { delta = h.bet; h.result = ['win', 'Win']; }
    else if (p < d) { delta = -h.bet; h.result = ['lose', 'Lose']; }
    else { delta = 0; h.result = ['push', 'Push']; }
    if (delta) h.result[1] += ` (${delta > 0 ? '+' : ''}${money(delta)})`;
    stats.won += delta;
    roundDelta += delta;
    wallet.bank += h.bet + delta; // stake was taken off the bank when it was placed
  }
  if (wallet.bet > wallet.bank) wallet.bet = wallet.bank;
  state.outcome = roundDelta > 0 ? 'won' : roundDelta < 0 ? 'lost' : 'push';
  const blackjack = state.hands[0].result[1].startsWith('Blackjack');
  Sound.play(blackjack ? 'blackjack' : { won: 'win', lost: 'lose', push: 'push' }[state.outcome], soundDelay);
  saveStats();
  saveBank();
  render();
}

// ---------------------------------------------------------------------------
// Decision tracking
// ---------------------------------------------------------------------------
function recordDecision(hand, ctx, action) {
  const up = state.dealer[0];
  const s = strategyFor(hand, up, ctx);
  const row = ROWS[s.rowKey];
  const correct = action === s.action;
  const situation = `${describeHand(hand.cards)} vs ${DEALER_COLS[s.col]}`;
  // Explain when the chart's preferred action isn't legal and its fallback applies.
  const preferred = { Dh: 'D', Ds: 'D', Uh: 'R', Us: 'R', Usp: 'R' }[s.code];
  const why = preferred === 'R' ? (hand.cards.length > 2 ? 'after hitting' : hand.fromSplit ? 'after a split' : 'with surrender turned off')
    : hand.cards.length > 2 ? 'after hitting' : 'without enough bank';
  const fallback = preferred && preferred !== s.action
    ? ` — ${ACTION_NAMES[preferred]} isn't allowed ${why}, so the fallback is ${ACTION_NAMES[s.action]}` : '';
  const detail = `${situation}: chart says ${s.code} (${CODE_TEXT[s.code]})${fallback}`;

  // Looked at the chart this round: give feedback but leave the stats alone.
  if (state.peeked) {
    if (correct) {
      state.correction = null;
      Sound.play('correct');
      setFeedback('good', `✓ Correct — ${ACTION_NAMES[action]} (not counted)`, `${detail} · ${PEEK_NOTE}`);
    } else {
      Sound.play('wrong');
      state.correction = { rowKey: s.rowKey, col: s.col, code: s.code, situation,
        chose: ACTION_NAMES[action], correct: ACTION_NAMES[s.action] };
      setFeedback('bad', `✗ You chose ${ACTION_NAMES[action]} — correct play is ${ACTION_NAMES[s.action]} (not counted)`,
        `${detail} · ${row.label} row · ${PEEK_NOTE}`);
    }
    return;
  }

  stats.decisions++;
  stats.cats[row.category].n++;
  stats.cats[row.category].acts[s.action].n++;
  const cellKey = `${s.rowKey}:${s.col}`;
  const cell = stats.cells[cellKey] || (stats.cells[cellKey] = { n: 0, miss: 0 });
  cell.n++;

  if (correct) {
    stats.correct++;
    stats.cats[row.category].c++;
    stats.cats[row.category].acts[s.action].c++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
    state.correction = null;
    Sound.play('correct');
    setFeedback('good', `✓ Correct — ${ACTION_NAMES[action]}`, detail);
  } else {
    stats.streak = 0;
    cell.miss++;
    Sound.play('wrong');
    stats.mistakes.unshift({ situation, chose: ACTION_NAMES[action], correct: ACTION_NAMES[s.action], code: s.code });
    stats.mistakes.length = Math.min(stats.mistakes.length, 50);
    state.correction = { rowKey: s.rowKey, col: s.col, code: s.code, situation,
      chose: ACTION_NAMES[action], correct: ACTION_NAMES[s.action] };
    setFeedback('bad', `✗ You chose ${ACTION_NAMES[action]} — correct play is ${ACTION_NAMES[s.action]}`,
      `${detail} · ${row.label} row`);
  }
  state.lastCell = cellKey;
  saveStats();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);
let feedback = { kind: 'neutral', title: '', detail: '' };

const PEEK_NOTE = 'Strategy chart was open this hand, so its decisions are not counted in your stats';

function setFeedback(kind, title, detail) { feedback = { kind, title, detail }; }

function cardEl(card, hidden) {
  const el = document.createElement('div');
  el.className = 'card' + (hidden ? ' back' : '');
  if (!hidden) {
    el.style.backgroundPosition =
      `calc(${-card.rank * 57}px * var(--s)) calc(${-card.suit * 89}px * var(--s))`;
    el.title = card.label;
  }
  return el;
}

function handEl(cards, { hideHole = false, active = false, total = '', result = null, outlined = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'hand' + (active ? ' active' : '') + (outlined && result ? ` outcome-${result[0]}` : '');
  const row = document.createElement('div');
  row.className = 'cards';
  cards.forEach((c, i) => row.appendChild(cardEl(c, hideHole && i === 1)));
  wrap.appendChild(row);
  if (total) {
    const t = document.createElement('div');
    t.className = 'total';
    t.textContent = total;
    wrap.appendChild(t);
  }
  if (result) {
    const r = document.createElement('div');
    r.className = 'result ' + result[0];
    r.textContent = result[1];
    wrap.appendChild(r);
  }
  return wrap;
}

function totalText(cards) {
  const { total, soft } = handValue(cards);
  if (total > 21) return `Bust (${total})`;
  if (total === 21 && cards.length === 2) return 'Blackjack';
  return soft && total < 21 ? `Soft ${total}` : String(total);
}

function render() {
  // Dealer
  const dealerBox = $('dealer');
  dealerBox.innerHTML = '';
  if (state.dealer.length) {
    const shown = state.holeHidden ? [state.dealer[0]] : state.dealer;
    dealerBox.appendChild(handEl(state.dealer, {
      hideHole: state.holeHidden,
      total: !opts.showTotals ? '' : state.holeHidden ? `Showing ${state.dealer[0].value === 11 ? 'A' : state.dealer[0].value}` : totalText(shown),
    }));
  }

  // Player
  const handsBox = $('hands');
  handsBox.innerHTML = '';
  state.hands.forEach((h, i) => {
    const total = opts.showTotals ? `${totalText(h.cards)} · ${money(h.bet)}` : money(h.bet);
    handsBox.appendChild(handEl(h.cards, {
      active: state.phase === 'player' && i === state.active && state.hands.length > 1,
      total, result: h.result,
      outlined: state.hands.length > 1, // split rounds: show each hand's own outcome
    }));
  });

  $('table').classList.toggle('won', state.outcome === 'won');
  $('table').classList.toggle('lost', state.outcome === 'lost');
  $('table').classList.toggle('push', state.outcome === 'push');

  // Feedback
  const fb = $('feedback');
  fb.className = 'feedback ' + feedback.kind;
  let detail = feedback.detail;
  if (state.phase === 'player' && feedback.kind === 'neutral') detail = promptText(); // follows the totals toggle
  if (state.phase === 'player' && feedback.kind !== 'neutral') detail += ` — Next: ${promptText()}`;
  if (state.phase === 'player' && feedback.kind === 'neutral' && state.peeked) detail += ` — ${PEEK_NOTE}.`;
  if (state.phase === 'done') detail += ' — Press Space to deal.';
  fb.innerHTML = `<div>${feedback.title}</div>${detail ? `<small>${detail}</small>` : ''}`;

  // Buttons
  const hand = state.phase === 'player' ? currentHand() : null;
  const ctx = hand ? context(hand) : null;
  document.querySelectorAll('[data-act]').forEach(b => {
    b.disabled = !hand || !allowed(b.dataset.act, hand, ctx);
  });
  const inRound = state.phase === 'player' || state.phase === 'dealer';
  $('deal').disabled = inRound;
  document.querySelectorAll('[data-chip]').forEach(b => {
    b.disabled = inRound || wallet.bet >= wallet.bank;
  });
  $('bet-clear').disabled = inRound;
  $('bet-max').disabled = inRound;
  $('bet-amount').textContent = money(inRound ? state.hands.reduce((sum, h) => sum + h.bet, 0) : wallet.bet);
  $('st-bank').textContent = money(wallet.bank);

  renderStats();
  renderChart();
  renderCorrection();
}

const PRACTICE_TIPS = {
  hard: () => opts.practice === 'hard' ? 'Normal dealing (no bias).' : 'Click to go back to normal dealing.',
  soft: on => on ? 'Dealing more soft hands. Click to go back to normal dealing.' : 'Click to deal more soft hands (an ace plus 2–9).',
  pair: on => on ? 'Dealing more pairs. Click to go back to normal dealing.' : 'Click to deal more pairs.',
};

function pct(c, n) { return n ? Math.round((c / n) * 100) + '%' : '–'; }

function renderStats() {
  $('st-acc').textContent = pct(stats.correct, stats.decisions);
  $('st-dec').textContent = stats.decisions;
  $('st-streak').textContent = stats.streak;
  $('st-best').textContent = stats.best;
  $('st-hands').textContent = stats.hands;
  $('st-net').textContent = (stats.won > 0 ? '+' : '') + money(stats.won);

  const catRow = (name, { n, c }, cls = '', attrs = '') => {
    const w = n ? (c / n) * 100 : 0;
    return `<div class="cat-row${cls}"${attrs}><span>${name}</span><div class="bar"><i style="width:${w}%"></i></div><span>${c}/${n} · ${pct(c, n)}</span></div>`;
  };
  $('cats').innerHTML = [['hard', 'Hard'], ['soft', 'Soft'], ['pair', 'Pairs']].map(([k, name]) => {
    const on = opts.practice === k && k !== 'hard';
    const attrs = ` data-practice="${k}" role="button" tabindex="0" aria-pressed="${on}" title="${PRACTICE_TIPS[k](on)}"`;
    return catRow(name, stats.cats[k], on ? ' practice on' : ' practice', attrs) +
      CATEGORY_ACTIONS[k].map(a => catRow(ACTION_NAMES[a], stats.cats[k].acts[a], ' sub')).join('');
  }).join('');

  // Decisions aren't counted while the chart is open, or for the rest of a hand it was opened during.
  const chartOpen = $('chart-panel').open;
  const peekedHand = state.peeked && (state.phase === 'player' || state.phase === 'dealer');
  $('cats-wrap').classList.toggle('paused', chartOpen || peekedHand);
  $('cats-paused').innerHTML = chartOpen
    ? '<span>Strategy chart is open, so decisions aren\'t counted in your stats. Close it before the next deal to count again.</span>'
    : peekedHand ? '<span>Strategy chart was opened this hand, so its decisions aren\'t counted. Counting resumes next deal.</span>' : '';

  $('mistakes').innerHTML = stats.mistakes.length
    ? stats.mistakes.slice(0, 25).map(m =>
        `<li>${m.situation}: <b>${m.chose}</b> → <em>${m.correct}</em> <span class="empty">(${m.code})</span></li>`).join('')
    : '<li class="empty">No mistakes yet.</li>';
}

function codeClass(code) {
  if (code === 'S') return 'c-S';
  if (code === 'H') return 'c-H';
  if (code === 'SP') return 'c-SP';
  if (code[0] === 'D') return 'c-D';
  return 'c-U';
}

// focus: { rowKey, col } highlights that row/column and marks the cell.
function chartHtml({ compact = false, focus = null } = {}) {
  let html = `<table class="chart${compact ? ' compact' : ''}"><tr><th>${compact ? 'Hand' : 'Player hand'}</th>` +
    DEALER_COLS.map((c, col) => `<th class="${focus && focus.col === col ? 'hl' : ''}">${c}</th>`).join('') + '</tr>';
  for (const sec of CHART) {
    html += `<tr><th class="section" colspan="11">${sec.section}</th></tr>`;
    for (const row of sec.rows) {
      const inRow = focus && focus.rowKey === row.key;
      html += `<tr><th class="${inRow ? 'hl' : ''}">${row.label}</th>`;
      row.codes.forEach((code, col) => {
        const key = `${row.key}:${col}`;
        let cls = codeClass(code);
        let miss = '';
        if (focus) {
          const inCol = focus.col === col;
          if (inRow && inCol) cls += ' target';
          else if (!inRow && !inCol) cls += ' dim';
        } else {
          const cell = stats.cells[key];
          if (cell && cell.miss) miss = `<span class="miss" title="Missed ${cell.miss} of ${cell.n}">${cell.miss}</span>`;
          if (state.lastCell === key) cls += ' last';
        }
        html += `<td class="${cls}">${code}${miss}</td>`;
      });
      html += '</tr>';
    }
  }
  return html + '</table>';
}

function renderChart() {
  $('chart').innerHTML = chartHtml();
}

function renderCorrection() {
  const c = state.correction;
  $('correction').classList.toggle('idle', !c);
  $('correction-body').innerHTML = c
    ? `<div class="verdict">You chose <b>${c.chose}</b> — correct play: <em>${c.correct}</em></div>
       <div class="why">${c.situation} → <b>${c.code}</b> (${CODE_TEXT[c.code]}) · ${ROWS[c.rowKey].label} row</div>
       ${chartHtml({ compact: true, focus: c })}`
    : '';
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
$('deal').addEventListener('click', deal);
$('reset').addEventListener('click', () => {
  if (!confirm('Reset all training stats?')) return;
  stats = freshStats();
  state.lastCell = null;
  state.correction = null;
  saveStats();
  render();
});
document.querySelectorAll('[data-chip]').forEach(b =>
  b.addEventListener('click', () => addChip(Number(b.dataset.chip))));
$('bet-clear').addEventListener('click', () => { wallet.bet = 0; Sound.play('chip'); saveBank(); render(); });
$('bet-max').addEventListener('click', () => { wallet.bet = wallet.bank; Sound.play('chip'); saveBank(); render(); });
function showVolume() {
  const pctVol = Math.round(Sound.volume * 100);
  $('opt-volume').value = pctVol;
  $('opt-volume').style.setProperty('--fill', pctVol + '%');
  $('volume-pct').textContent = pctVol ? pctVol + '%' : 'Muted';
}
showVolume();
$('opt-volume').addEventListener('input', e => { Sound.volume = e.target.value / 100; showVolume(); });
$('opt-volume').addEventListener('change', () => Sound.play('chip')); // preview once released
$('reset-bank').addEventListener('click', () => {
  if (state.phase === 'player' || state.phase === 'dealer') return;
  if (!confirm(`Reset your bank to ${money(STARTING_BANK)}?`)) return;
  wallet.bank = STARTING_BANK;
  wallet.bet = Math.min(wallet.bet || 25, wallet.bank);
  saveBank();
  setFeedback('neutral', `Bank reset to ${money(STARTING_BANK)}.`, 'Place a bet and deal.');
  render();
});
$('chart-panel').addEventListener('toggle', () => {
  if ($('chart-panel').open && state.phase === 'player') state.peeked = true;
  render(); // also refreshes the "not counted" overlay on the accuracy panel
});
function setPractice(k) {
  opts.practice = k === opts.practice ? 'hard' : k;
  saveOpts();
  render();
}
$('cats').addEventListener('click', e => {
  const row = e.target.closest('[data-practice]');
  if (row) setPractice(row.dataset.practice);
});
$('cats').addEventListener('keydown', e => {
  const row = e.target.closest('[data-practice]');
  if (!row || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  e.stopPropagation(); // don't let Space/Enter also deal
  setPractice(row.dataset.practice);
  $('cats').querySelector(`[data-practice="${row.dataset.practice}"]`).focus();
});
// Browsers can restore checkbox state on reload without firing 'change'; opts is the source of truth.
for (const [id, key] of [['opt-surrender', 'surrender'], ['opt-h17', 'h17'], ['opt-totals', 'showTotals'], ['opt-dealer-delay', 'animate']]) {
  $(id).checked = opts[key];
  $(id).addEventListener('change', e => { opts[key] = e.target.checked; saveOpts(); render(); });
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'enter' || k === 'n') {
    e.preventDefault();
    deal();
  } else if (k === 'm') {
    Sound.toggleMute();
    showVolume();
  } else if ({ h: 'H', s: 'S', d: 'D', p: 'P', r: 'R' }[k]) {
    act({ h: 'H', s: 'S', d: 'D', p: 'P', r: 'R' }[k]);
  }
});

render();
