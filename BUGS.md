# Bugs / Gotchas

## 1) Overlapping ships during setup
- **Symptom**
  - Clicking to place a ship could place it on top of a previously placed ship (illegal placement).
- **Cause**
  - Placement must check each candidate cell to ensure it has no existing `occupant`.
- **Fix**
  - `validatePlacement()` checks `board[c.row][c.col].occupant !== null` and rejects with `"Overlaps another ship."`.
- **How verified**
  - Attempted to place a ship such that it intersects an already-placed ship; placement is rejected and an error message is added.

## 2) Out-of-bounds ship placement
- **Symptom**
  - Clicking near the right/bottom edge could place part of a ship outside the 10x10 grid.
- **Cause**
  - Horizontal/vertical placement must validate that every generated coordinate is within `[0, BOARD_SIZE)`.
- **Fix**
  - `allCoordsForPlacement()` generates the full set of coordinates; `validatePlacement()` checks `inBounds()` for each coord and rejects with `"Out of bounds."`.
- **How verified**
  - Tried placing a length-5 ship starting at column 8 horizontally (or row 8 vertically); placement is rejected with an error message.

## 3) Repeated shots on the same cell
- **Symptom**
  - Firing at the same enemy cell more than once would incorrectly allow multiple hits/misses on the same square.
- **Cause**
  - A cell needs a persistent shot state, and fire resolution must reject non-`unknown` shot states.
- **Fix**
  - `fireAt()` checks `cell.shot !== 'unknown'` and returns a `repeat` outcome, also pushing `"You already fired there."` as an error message.
- **How verified**
  - Fired at a cell, then fired at it again; the second click does not change state and produces the repeat-shot error message.

## 4) AI taking multiple turns
- **Symptom**
  - After the player fires once, AI could incorrectly continue firing (double-turn / loop) if turn-switching is wrong.
- **Cause**
  - The UI reducer must only trigger *one* AI action and only when it becomes the AI’s turn.
- **Fix**
  - In `gameReducer` for `play/fire`, AI is invoked exactly once:
    - only if `next.phase === 'play' && next.turn === 'enemy'`.
- **How verified**
  - Fired a single shot and observed exactly one subsequent AI shot occurs, after which the turn returns to `you` (unless the game ended).

## 5) TypeScript unreachable check in AI turn logic
- **Symptom**
  - TypeScript error: comparison appeared unintentional between `'play'` and `'game_over'`.
- **Cause**
  - Code checked `state.phase !== 'play'` and then also checked `state.phase === 'game_over'`, which is unreachable.
- **Fix**
  - Removed the redundant `state.phase === 'game_over'` branch in `takeAiTurn()`.
- **How verified**
  - TS error disappears and compilation proceeds; game flow unchanged.
