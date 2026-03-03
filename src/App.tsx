import './App.css'
import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  BOARD_SIZE,
  gameReducer,
  getNextUnplacedShipId,
  getShipLength,
  initialGameState,
  type Coord,
} from './game'
import { BoardGridView, MessageList } from './ui'

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  const nextShipId = getNextUnplacedShipId(state.you.fleet)
  const nextShipLength = nextShipId ? getShipLength(state.you.fleet, nextShipId) : null

  const statusText = useMemo(() => {
    if (state.phase === 'setup') {
      return nextShipId && nextShipLength
        ? `Setup: place ship of length ${nextShipLength} (${state.orientation}).`
        : 'Setup: all ships placed.'
    }
    if (state.phase === 'play') {
      return state.turn === 'you' ? 'Play: your turn.' : 'Play: enemy turn.'
    }
    return state.turn === 'you' ? 'Game over — You win!' : 'Game over — You lose.'
  }, [nextShipId, nextShipLength, state.orientation, state.phase, state.turn])

  const onRotate = () => {
    const next = state.orientation === 'horizontal' ? 'vertical' : 'horizontal'
    dispatch({ type: 'setup/rotate', payload: { orientation: next } })
  }

  const onRestart = () => {
    dispatch({ type: 'game/restart' })
  }

  const onYourCellClick = (coord: Coord) => {
    if (state.phase !== 'setup') return
    if (!nextShipId) return
    dispatch({ type: 'setup/placeShip', payload: { shipId: nextShipId, start: coord } })
  }

  const onEnemyCellClick = (coord: Coord) => {
    if (state.phase !== 'play') return
    if (state.turn !== 'you') return
    dispatch({ type: 'play/fire', payload: { target: coord } })
  }

  return (
    <div
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Battleship</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{statusText}</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={onRotate} disabled={state.phase !== 'setup'}>
            Rotate ({state.orientation})
          </button>
          <button type="button" onClick={onRestart}>
            Restart
          </button>
          <button type="button" onClick={() => setDark(d => !d)}>
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 14 }}>AI Level:</span>
            {([1, 2, 3] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                disabled={state.phase !== 'setup'}
                style={{ fontWeight: state.level === lvl ? 'bold' : 'normal' }}
                onClick={() => dispatch({ type: 'game/setLevel', payload: { level: lvl } })}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <BoardGridView
          title="Your Board"
          board={state.you.board}
          onCellClick={state.phase === 'setup' ? onYourCellClick : undefined}
          revealShips={true}
          disabled={state.phase !== 'setup'}
        />

        <BoardGridView
          title="Enemy Board"
          board={state.enemy.board}
          onCellClick={state.phase === 'play' ? onEnemyCellClick : undefined}
          revealShips={state.phase === 'game_over'}
          disabled={state.phase !== 'play' || state.turn !== 'you'}
        />
      </main>

      <MessageList messages={state.messages} />

      <footer style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        Board size: {BOARD_SIZE}x{BOARD_SIZE}
      </footer>
    </div>
  )
}

export default App
