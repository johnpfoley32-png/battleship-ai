import type { BoardGrid, Coord } from '../game'

export type BoardGridProps = Readonly<{
  title: string
  board: BoardGrid
  onCellClick?: (coord: Coord) => void
  revealShips: boolean
  disabled?: boolean
}>

const cellColor = (opts: {
  shot: 'unknown' | 'hit' | 'miss'
  hasShip: boolean
  revealShips: boolean
}) => {
  if (opts.shot === 'hit') return '#dc2626'
  if (opts.shot === 'miss') return '#3b82f6'
  if (opts.revealShips && opts.hasShip) return '#6b7280'
  return '#111827'
}

export function BoardGridView({
  title,
  board,
  onCellClick,
  revealShips,
  disabled = false,
}: BoardGridProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${board.length}, 28px)`,
          gridTemplateRows: `repeat(${board.length}, 28px)`,
          gap: 4,
        }}
      >
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const coord: Coord = { row: rowIdx, col: colIdx }
            const hasShip = cell.occupant !== null
            const isClickable = Boolean(onCellClick) && !disabled
            const bg = cellColor({ shot: cell.shot, hasShip, revealShips })

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                type="button"
                onClick={isClickable ? () => onCellClick?.(coord) : undefined}
                disabled={!isClickable}
                aria-label={`${title} row ${rowIdx + 1} col ${colIdx + 1}`}
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: bg,
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: isClickable ? 1 : 0.9,
                }}
              />
            )
          }),
        )}
      </div>
    </section>
  )
}
