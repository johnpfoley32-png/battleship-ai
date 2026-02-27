import type { GameAction } from './actions'
import type { Fleet, GameState, ShipId } from './types'
import {
  clearMessages,
  createInitialState,
  fireAt,
  isFleetFullyPlaced,
  placeShip,
  randomlyPlaceFleet,
  startPlayPhase,
  takeAiTurn,
  toggleOrientation,
  pushMessage,
} from './logic'

export const getNextUnplacedShipId = (fleet: Fleet): ShipId | null => {
  for (const spec of fleet.specs) {
    const placed = fleet.placements.some((p) => p.shipId === spec.id)
    if (!placed) return spec.id
  }
  return null
}

export const getShipLength = (fleet: Fleet, shipId: ShipId): number | null => {
  return fleet.specs.find((s) => s.id === shipId)?.length ?? null
}

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'setup/rotate': {
      return { ...state, orientation: action.payload.orientation }
    }

    case 'setup/placeShip': {
      if (state.phase !== 'setup') return state

      const placed = placeShip(state, 'you', action.payload.shipId, action.payload.start, state.orientation)
      if (!placed.ok) {
        return pushMessage(state, { kind: 'error', text: placed.error })
      }

      let next = placed.value

      if (isFleetFullyPlaced(next.you.fleet)) {
        const enemy = randomlyPlaceFleet(next.enemy.fleet.specs)
        if (!enemy.ok) {
          return pushMessage(next, { kind: 'error', text: enemy.error })
        }

        const started = startPlayPhase(next, { enemy: { board: enemy.value.board, fleet: enemy.value.fleet } })
        if (!started.ok) {
          return pushMessage(next, { kind: 'error', text: started.error })
        }

        next = started.value
        next = pushMessage(next, { kind: 'info', text: 'Battle start!' })
      }

      return next
    }

    case 'play/fire': {
      if (state.phase !== 'play') return state

      const fired = fireAt(state, 'you', action.payload.target)
      if (!fired.ok) {
        return pushMessage(state, { kind: 'error', text: fired.error })
      }

      let next = fired.value.nextState

      if (next.phase === 'play' && next.turn === 'enemy') {
        const ai = takeAiTurn(next)
        if (ai.ok) next = ai.value
      }

      return next
    }

    case 'game/clearMessages': {
      return clearMessages(state)
    }

    case 'game/restart': {
      return createInitialState()
    }

    default: {
      return state
    }
  }
}

export const initialGameState = (): GameState => createInitialState()

export const rotateAction = (state: GameState): GameAction => ({
  type: 'setup/rotate',
  payload: { orientation: toggleOrientation(state).orientation },
})
