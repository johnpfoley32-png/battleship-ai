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

## 6) AI turn failure causes game lock
- **Symptom**
  - If `takeAiTurn()` fails for any reason (e.g. no available shots), the turn remains `'enemy'` and the player can never fire again — the game is stuck.
- **Cause**
  - In `gameReducer`, the `play/fire` case only updated `next` when `ai.ok` was true. When false, `next` kept `turn: 'enemy'` from the player's shot result, permanently locking the UI.
- **Fix**
  - Added an `else` branch: when `takeAiTurn()` fails, reset `next.turn` to `'you'` so the player can continue.
- **How verified**
  - Code review confirmed the fallback path; tests still pass.

## 7) Hit/miss/sunk messages are ambiguous between player and AI
- **Symptom**
  - Both the player's and AI's shots produce identical messages ("Hit!", "Miss.", "Sunk!"), so the player cannot tell whose shot produced a given message.
- **Cause**
  - `fireAt()` used the same text strings regardless of the `attacker` argument.
- **Fix**
  - Messages now include a label: `"You: Hit!"` / `"Enemy: Hit!"`, `"You: Miss."` / `"Enemy: Miss."`, and `"You: Sunk a ship!"` / `"Enemy: Sunk a ship!"`.
- **How verified**
  - Manual browser testing confirmed distinct labels appear for player vs AI actions.

## 8) Game over status text does not indicate winner
- **Symptom**
  - When the game ends, the status bar shows a generic "Game over." regardless of who won or lost.
- **Cause**
  - The `statusText` memo in `App.tsx` had a single fallback string for the `game_over` phase.
- **Fix**
  - Status now reads `"Game over — You win!"` or `"Game over — You lose."` based on `state.turn`.
- **How verified**
  - Code review confirmed the conditional; the `turn` field retains the winner at game end.

## 9) Messages accumulate unboundedly across turns
- **Symptom**
  - The internal `messages` array grows with every shot taken throughout the entire game. Old messages from many turns ago persist in state.
- **Cause**
  - The `clearMessages` action existed but was never dispatched. Each `fireAt()` call appended to the existing array.
- **Fix**
  - The `play/fire` reducer case now calls `clearMessages(state)` before passing the state to `fireAt()`, so only the current round's messages are shown.
- **How verified**
  - Manual testing confirmed that after each shot pair, only the current round's messages appear.

## 5) TypeScript unreachable check in AI turn logic
- **Symptom**
  - TypeScript error: comparison appeared unintentional between `'play'` and `'game_over'`.
- **Cause**
  - Code checked `state.phase !== 'play'` and then also checked `state.phase === 'game_over'`, which is unreachable.
- **Fix**
  - Removed the redundant `state.phase === 'game_over'` branch in `takeAiTurn()`.
- **How verified**
  - TS error disappears and compilation proceeds; game flow unchanged.
