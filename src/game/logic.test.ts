import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  createInitialState,
  createDefaultShipSpecs,
  fireAt,
  placeShip,
  randomlyPlaceFleet,
  takeAiTurn,
} from './index'

type PlayState = Omit<ReturnType<typeof createInitialState>, 'phase'> & { phase: 'play' }

const makePlayState = (): PlayState => {
  const base = createInitialState()
  const enemyPlaced = randomlyPlaceFleet(createDefaultShipSpecs())
  if (!enemyPlaced.ok) throw new Error(enemyPlaced.error)

  // Put the game directly into play for shot-related tests.
  return {
    ...base,
    phase: 'play' as const,
    turn: 'you' as const,
    enemy: {
      board: enemyPlaced.value.board,
      fleet: enemyPlaced.value.fleet,
    },
  } as PlayState
}

describe('ship placement', () => {
  it('ships cannot overlap', () => {
    let state = createInitialState()

    const p1 = placeShip(state, 'you', 'ship-0', { row: 0, col: 0 }, 'horizontal')
    expect(p1.ok).toBe(true)
    if (!p1.ok) return
    state = p1.value

    // ship-1 length 4 would overlap (0,0)-(0,3)
    const p2 = placeShip(state, 'you', 'ship-1', { row: 0, col: 0 }, 'horizontal')
    expect(p2.ok).toBe(false)
    if (!p2.ok) expect(p2.error.toLowerCase()).toContain('overlap')
  })

  it('ships cannot go out of bounds', () => {
    let state = createInitialState()

    // ship-0 length 5 starting at col 8 horizontally goes out of bounds
    const res = placeShip(state, 'you', 'ship-0', { row: 0, col: BOARD_SIZE - 2 }, 'horizontal')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('out of bounds')
  })
})

describe('firing rules', () => {
  it('cannot fire the same cell twice', () => {
    const state = makePlayState()

    const first = fireAt(state, 'you', { row: 0, col: 0 })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    // Force it to remain your turn so we can test repeat-fire behavior.
    const stillYourTurn = { ...first.value.nextState, turn: 'you' as const }

    const second = fireAt(stillYourTurn, 'you', { row: 0, col: 0 })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.value.outcome.result).toBe('repeat')
  })
})

describe('AI', () => {
  it('AI never repeats a shot across many turns', () => {
    const base = makePlayState()

    // Give AI the turn.
    let state: PlayState & { turn: 'enemy' } = { ...base, turn: 'enemy' as const }

    // AI should never repeat, so 100 turns should yield 100 unique attemptedShots.
    const turns = 100
    for (let i = 0; i < turns; i++) {
      const next = takeAiTurn(state)
      expect(next.ok).toBe(true)
      if (!next.ok) return

      expect(next.value.phase).toBe('play')

      state = { ...(next.value as PlayState), phase: 'play' as const, turn: 'enemy' as const }

      const keys = state.ai.attemptedShots.map((c) => `${c.row},${c.col}`)
      const unique = new Set(keys)
      expect(unique.size).toBe(keys.length)
    }
  })
})
