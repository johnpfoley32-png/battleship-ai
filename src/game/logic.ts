import {
  BOARD_SIZE,
  DEFAULT_SHIP_LENGTHS,
  type AiMemory,
  type BoardCell,
  type BoardGrid,
  type Coord,
  type Fleet,
  type GameMessage,
  type GameMessageKind,
  type GamePhase,
  type GameState,
  type Orientation,
  type PlayerId,
  type ShipId,
  type ShipPlacement,
  type ShipSpec,
  type ShotResult,
  type Turn,
} from './types'

export type Result<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: string }>

export type FireOutcome = Readonly<{
  attacker: PlayerId
  defender: PlayerId
  target: Coord
  result: 'invalid' | 'repeat' | 'miss' | 'hit' | 'sunk' | 'win'
  hitShipId: ShipId | null
}>

const coordKey = (c: Coord) => `${c.row},${c.col}`

const inBounds = (c: Coord) =>
  c.row >= 0 && c.row < BOARD_SIZE && c.col >= 0 && c.col < BOARD_SIZE

export const createEmptyCell = (): BoardCell => ({ occupant: null, shot: 'unknown' })

export const createEmptyBoard = (): BoardGrid =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => createEmptyCell()),
  )

export const createDefaultShipSpecs = (): ReadonlyArray<ShipSpec> =>
  DEFAULT_SHIP_LENGTHS.map((length, idx) => ({ id: `ship-${idx}`, length }))

export const createFleet = (specs: ReadonlyArray<ShipSpec>): Fleet => ({
  specs,
  placements: [],
  hitsByShipId: {},
})

export const createInitialState = (): GameState => {
  const youSpecs = createDefaultShipSpecs()
  const enemySpecs = createDefaultShipSpecs()

  return {
    phase: 'setup',
    orientation: 'horizontal',
    turn: 'you',
    you: {
      board: createEmptyBoard(),
      fleet: createFleet(youSpecs),
    },
    enemy: {
      board: createEmptyBoard(),
      fleet: createFleet(enemySpecs),
    },
    ai: { attemptedShots: [] },
    messages: [],
  }
}

export const setOrientation = (state: GameState, orientation: Orientation): GameState => ({
  ...state,
  orientation,
})

export const toggleOrientation = (state: GameState): GameState => ({
  ...state,
  orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
})

export const allCoordsForPlacement = (
  start: Coord,
  orientation: Orientation,
  length: number,
): ReadonlyArray<Coord> => {
  const coords: Coord[] = []
  for (let i = 0; i < length; i++) {
    coords.push(
      orientation === 'horizontal'
        ? { row: start.row, col: start.col + i }
        : { row: start.row + i, col: start.col },
    )
  }
  return coords
}

export const findShipSpec = (fleet: Fleet, shipId: ShipId): ShipSpec | null =>
  fleet.specs.find((s) => s.id === shipId) ?? null

export const isShipPlaced = (fleet: Fleet, shipId: ShipId): boolean =>
  fleet.placements.some((p) => p.shipId === shipId)

export type PlacementValidation = Readonly<{
  ok: true
  placement: ShipPlacement
}> |
  Readonly<{
    ok: false
    error: string
  }>

export const validatePlacement = (
  board: BoardGrid,
  fleet: Fleet,
  shipId: ShipId,
  start: Coord,
  orientation: Orientation,
): PlacementValidation => {
  const spec = findShipSpec(fleet, shipId)
  if (!spec) return { ok: false, error: 'Unknown ship.' }
  if (isShipPlaced(fleet, shipId)) return { ok: false, error: 'Ship already placed.' }

  const coords = allCoordsForPlacement(start, orientation, spec.length)
  for (const c of coords) {
    if (!inBounds(c)) return { ok: false, error: 'Out of bounds.' }
    if (board[c.row][c.col].occupant !== null) return { ok: false, error: 'Overlaps another ship.' }
  }

  return {
    ok: true,
    placement: {
      shipId,
      start,
      orientation,
      length: spec.length,
      coords,
    },
  }
}

const setCell = (board: BoardGrid, coord: Coord, cell: BoardCell): BoardGrid => {
  const newRow = board[coord.row].slice()
  newRow[coord.col] = cell

  const newBoard = board.slice()
  newBoard[coord.row] = newRow
  return newBoard
}

export const applyPlacement = (board: BoardGrid, placement: ShipPlacement): BoardGrid => {
  let next = board
  for (const c of placement.coords) {
    const existing = next[c.row][c.col]
    next = setCell(next, c, { ...existing, occupant: placement.shipId })
  }
  return next
}

export const placeShip = (
  state: GameState,
  player: PlayerId,
  shipId: ShipId,
  start: Coord,
  orientation: Orientation,
): Result<GameState> => {
  const side = state[player]
  const validation = validatePlacement(side.board, side.fleet, shipId, start, orientation)
  if (!validation.ok) return { ok: false, error: validation.error }

  const placement = validation.placement
  const nextBoard = applyPlacement(side.board, placement)
  const nextFleet: Fleet = {
    ...side.fleet,
    placements: [...side.fleet.placements, placement],
    hitsByShipId: { ...side.fleet.hitsByShipId, [placement.shipId]: 0 },
  }

  return {
    ok: true,
    value: {
      ...state,
      [player]: {
        board: nextBoard,
        fleet: nextFleet,
      },
    },
  }
}

export const isFleetFullyPlaced = (fleet: Fleet): boolean =>
  fleet.placements.length === fleet.specs.length

export const getShipCellsHitCount = (fleet: Fleet, shipId: ShipId): number =>
  fleet.hitsByShipId[shipId] ?? 0

export const isShipSunk = (fleet: Fleet, shipId: ShipId): boolean => {
  const spec = findShipSpec(fleet, shipId)
  if (!spec) return false
  return getShipCellsHitCount(fleet, shipId) >= spec.length
}

export const areAllShipsSunk = (fleet: Fleet): boolean =>
  fleet.specs.every((s) => isShipSunk(fleet, s.id))

const message = (kind: GameMessageKind, text: string): GameMessage => ({ kind, text })

export const clearMessages = (state: GameState): GameState => ({ ...state, messages: [] })

export const pushMessage = (state: GameState, msg: GameMessage): GameState => ({
  ...state,
  messages: [...state.messages, msg],
})

const otherPlayer = (p: PlayerId): PlayerId => (p === 'you' ? 'enemy' : 'you')

export const fireAt = (state: GameState, attacker: PlayerId, target: Coord): Result<{
  nextState: GameState
  outcome: FireOutcome
}> => {
  const defender = otherPlayer(attacker)

  if (state.phase !== 'play') {
    return { ok: false, error: 'Not in play phase.' }
  }
  if (state.turn !== attacker) {
    return { ok: false, error: 'Not your turn.' }
  }
  if (!inBounds(target)) {
    return { ok: false, error: 'Out of bounds.' }
  }

  const defSide = state[defender]
  const cell = defSide.board[target.row][target.col]
  if (cell.shot !== 'unknown') {
    return {
      ok: true,
      value: {
        nextState: pushMessage(state, message('error', 'You already fired there.')),
        outcome: {
          attacker,
          defender,
          target,
          result: 'repeat',
          hitShipId: cell.occupant,
        },
      },
    }
  }

  const isHit = cell.occupant !== null
  const nextShot: ShotResult = isHit ? 'hit' : 'miss'
  const nextDefBoard = setCell(defSide.board, target, { ...cell, shot: nextShot })

  let nextDefFleet = defSide.fleet
  let msgState: GameState = state
  let result: FireOutcome['result'] = isHit ? 'hit' : 'miss'
  let hitShipId: ShipId | null = cell.occupant

  const label = attacker === 'you' ? 'You' : 'Enemy'

  if (isHit && cell.occupant) {
    const currentHits = getShipCellsHitCount(defSide.fleet, cell.occupant)
    const updatedHits = currentHits + 1
    nextDefFleet = {
      ...defSide.fleet,
      hitsByShipId: { ...defSide.fleet.hitsByShipId, [cell.occupant]: updatedHits },
    }

    msgState = pushMessage(msgState, message('hit', `${label}: Hit!`))

    if (isShipSunk(nextDefFleet, cell.occupant)) {
      result = 'sunk'
      msgState = pushMessage(msgState, message('sunk', `${label}: Sunk a ship!`))

      if (areAllShipsSunk(nextDefFleet)) {
        result = 'win'
        msgState = pushMessage(
          msgState,
          message(attacker === 'you' ? 'win' : 'lose', attacker === 'you' ? 'You win!' : 'You lose.'),
        )
      }
    }
  } else {
    msgState = pushMessage(msgState, message('miss', `${label}: Miss.`))
  }

  const phase: GamePhase = result === 'win' ? 'game_over' : msgState.phase

  const nextTurn: Turn = result === 'win' ? msgState.turn : otherPlayer(attacker)

  const nextState: GameState = {
    ...msgState,
    phase,
    turn: nextTurn,
    [defender]: {
      board: nextDefBoard,
      fleet: nextDefFleet,
    },
  }

  return {
    ok: true,
    value: {
      nextState,
      outcome: {
        attacker,
        defender,
        target,
        result,
        hitShipId,
      },
    },
  }
}

export const startPlayPhase = (
  state: GameState,
  enemyPlacedState: Pick<GameState, 'enemy'>,
): Result<GameState> => {
  if (!isFleetFullyPlaced(state.you.fleet)) return { ok: false, error: 'Place all your ships first.' }
  return {
    ok: true,
    value: {
      ...state,
      phase: 'play',
      turn: 'you',
      enemy: enemyPlacedState.enemy,
      messages: [],
    },
  }
}

export const allCoords = (): ReadonlyArray<Coord> => {
  const coords: Coord[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      coords.push({ row, col })
    }
  }
  return coords
}

export const chooseRandomUnshotCoord = (
  board: BoardGrid,
  rng: () => number = Math.random,
): Coord | null => {
  const candidates: Coord[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col].shot === 'unknown') candidates.push({ row, col })
    }
  }
  if (candidates.length === 0) return null
  const idx = Math.floor(rng() * candidates.length)
  return candidates[idx] ?? null
}

export const applyAiMemoryShot = (ai: AiMemory, coord: Coord): AiMemory => {
  const existing = new Set(ai.attemptedShots.map(coordKey))
  if (existing.has(coordKey(coord))) return ai
  return { attemptedShots: [...ai.attemptedShots, coord] }
}

export const takeAiTurn = (state: GameState, rng: () => number = Math.random): Result<GameState> => {
  if (state.phase !== 'play') return { ok: false, error: 'Not in play phase.' }
  if (state.turn !== 'enemy') return { ok: false, error: 'Not AI turn.' }

  const coord = chooseRandomUnshotCoord(state.you.board, rng)
  if (!coord) return { ok: false, error: 'No available shots.' }

  const fired = fireAt(state, 'enemy', coord)
  if (!fired.ok) return fired

  const nextState = {
    ...fired.value.nextState,
    ai: applyAiMemoryShot(fired.value.nextState.ai, coord),
  }

  return { ok: true, value: nextState }
}

export const randomlyPlaceFleet = (
  specs: ReadonlyArray<ShipSpec>,
  rng: () => number = Math.random,
): Result<{ board: BoardGrid; fleet: Fleet }> => {
  let board = createEmptyBoard()
  let fleet = createFleet(specs)

  for (const spec of specs) {
    let placed = false
    let attempts = 0

    while (!placed) {
      attempts++
      if (attempts > 5000) return { ok: false, error: 'Failed to place fleet.' }

      const orientation: Orientation = rng() < 0.5 ? 'horizontal' : 'vertical'
      const start: Coord = {
        row: Math.floor(rng() * BOARD_SIZE),
        col: Math.floor(rng() * BOARD_SIZE),
      }

      const validation = validatePlacement(board, fleet, spec.id, start, orientation)
      if (!validation.ok) continue

      board = applyPlacement(board, validation.placement)
      fleet = {
        ...fleet,
        placements: [...fleet.placements, validation.placement],
        hitsByShipId: { ...fleet.hitsByShipId, [spec.id]: 0 },
      }
      placed = true
    }
  }

  return { ok: true, value: { board, fleet } }
}

export const restartGame = (): GameState => createInitialState()
