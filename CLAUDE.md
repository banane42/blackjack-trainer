# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A browser-based blackjack basic-strategy trainer. Plain HTML/CSS/vanilla JS — no build step, no dependencies, no package manager, no tests, not a git repo.

## Wiki
https://en.wikipedia.org/wiki/Blackjack

## Running

Open `index.html` directly in a browser, or serve the directory (e.g. `python3 -m http.server`) and visit `http://localhost:8000`. Scripts are classic `<script>` tags (not modules), so `file://` works.

## Files

- `index.html` — all markup and CSS (inline `<style>`). Loads `sound.js` then `trainer.js`; `trainer.js` depends on the global `Sound`.
- `trainer.js` — all game logic, strategy evaluation, stats, and rendering.
- `sound.js` — `Sound` IIFE that synthesizes every effect with Web Audio (no audio files). `Sound.play(name, when)` where `when` is seconds from now; sequencing of card/chip/outcome sounds is done by passing offsets, not timers.
- `strategy-table.html` / `strategy-table-key.html` — reference copies of the source strategy chart (Wikipedia markup). Not loaded by the app.
- `card-deck-spritesheet.png` — 741×356 sheet of 57×89 px cards: columns are ranks A–K (rank index 0–12), rows are suits in the order of `SUITS` (♣ ♦ ♠ ♥). Scaled by the CSS var `--s`. Licensed CC-BY-SA-4.0, created by John Riggles ("sudo_whoami"); keep the attribution footer in `index.html`.

## Architecture (trainer.js)

**Strategy chart is data.** `CHART` is a transcription of `strategy-table.html`: sections (hard/soft/pair) of rows, each with space-separated codes for dealer upcards 2–A. Codes (`S`, `H`, `Dh`, `Ds`, `SP`, `Uh`, `Us`, `Usp`) encode a preferred action plus a fallback. If you change the chart, keep it in sync with the reference HTML and with the legend in `index.html`.

**Evaluating a decision** goes through three steps:
1. `context(hand)` computes legality (`canDouble`, `canSplit`, `canSurrender`) from the hand, number of split hands (max 4), bank balance, and `opts.surrender`. Surrender is late-surrender only, first two cards, unsplit hand. Double after split is allowed.
2. `strategyFor(hand, upcard, ctx)` picks the chart row: pair row only if `ctx.canSplit` is true (so an unaffordable pair falls through to soft/hard), else soft/hard via `softKey`/`hardKey`.
3. `resolveCode(code, ctx)` turns the chart code into a concrete action using the fallback when the preferred action is illegal.

`recordDecision` compares the player's action with that result *before* the action is applied in `act()`. If `state.peeked` is set (the `#chart-panel` details was open at deal, or opened during the player phase), it still gives feedback and sets the correction but updates no stats; the flag resets on the next `deal()`.

**Game flow** is a phase machine on `state.phase`: `idle → player → dealer → done`. `deal()` → `act()` per decision → `advance()` moves to the next unfinished hand (split hands are inserted after the active one) → `dealerTurn()` (honors `opts.h17`, animated via `setTimeout` when `opts.animate`) → `finishRound()` settles each hand. Natural/dealer-blackjack checks happen in `deal()` and skip straight to `finishRound()`.

**Money:** stakes are deducted from `wallet.bank` when placed (deal, double, split); `finishRound` returns `bet + delta`. Blackjack pays 3:2, surrender loses half. A natural only counts for a single unsplit hand.

**Rendering:** one `render()` function rebuilds the dealer, hands, feedback, buttons, stats, strategy chart, and correction panel from state on every change via `innerHTML`. Mutate state, then call `render()`. Feedback text is set with `setFeedback()` and shown on the next render. `chartHtml()` serves both the full chart (miss badges from `stats.cells`, `last` outline) and the compact correction chart (`focus` highlights row/column).

**Persistence (localStorage):** four independent keys, each read/write wrapped in try/catch:
- `bjtrainer.v1` — training stats (`loadStats` migrates older saves; bump/migrate when changing shape). Per-cell stats are keyed `"rowKey:col"`, so renaming row keys orphans saved data.
- `bjtrainer.bank.v1` — bank and current bet, kept separate so "Reset stats" doesn't reset money.
- `bjtrainer.sound.v2` — volume `{ volume, restore }` (owned by `sound.js`; migrates the old `bjtrainer.sound.v1` on/off boolean, `false` → muted). `Sound.volume` is 0–1, `Sound.toggleMute()` backs the M key.
- `bjtrainer.opts.v1` — the `opts` checkboxes (surrender, H17, animation, show hand totals). Loaded over the defaults key by key, so adding an option needs no migration.

## Testing changes

There is no test suite. Verify in a browser; keyboard shortcuts (Space/Enter/N deal, H/S/D/P/R act, M mute/unmute) speed up playtesting. The shoe is 6 decks reshuffled at 25% remaining (`CUT_REMAINING`), so specific hands can't be forced without temporarily editing `deal()`/`draw()`.
