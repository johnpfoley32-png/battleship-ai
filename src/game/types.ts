export const BOARD_SIZE = 10 as const

export const DEFAULT_SHIP_LENGTHS = [5, 4, 3, 3, 2] as const
export type ShipLength = (typeof DEFAULT_SHIP_LENGTHS)[number]

export type PlayerId = 'you' | 'enemy'

export type Orientation = 'horizontal' | 'vertical'

export type GamePhase = 'setup' | 'play' | 'game_over'

export type Coord = Readonly<{
  row: number
  col: number
}>

export type ShipId = string

export type ShipSpec = Readonly<{
  id: ShipId
  length: number
}>

export type ShipPlacement = Readonly<{
  shipId: ShipId
  start: Coord
  orientation: Orientation
  length: number
  coords: ReadonlyArray<Coord>
}>

export type CellOccupant = null | ShipId

export type ShotResult = 'unknown' | 'hit' | 'miss'

export type BoardCell = Readonly<{
  occupant: CellOccupant
  shot: ShotResult
}>

export type BoardGrid = ReadonlyArray<ReadonlyArray<BoardCell>>

export type Fleet = Readonly<{
  specs: ReadonlyArray<ShipSpec>
  placements: ReadonlyArray<ShipPlacement>
  hitsByShipId: Readonly<Record<ShipId, number>>
}>

export type Turn = PlayerId

export type GameMessageKind =
  | 'info'
  | 'error'
  | 'hit'
  | 'miss'
  | 'sunk'
  | 'win'
  | 'lose'

export type GameMessage = Readonly<{
  kind: GameMessageKind
  text: string
}>

export type AiMemory = Readonly<{
  attemptedShots: ReadonlyArray<Coord>
}>

export type GameState = Readonly<{
  phase: GamePhase
  orientation: Orientation
  turn: Turn
  you: Readonly<{
    board: BoardGrid
    fleet: Fleet
  }>
  enemy: Readonly<{
    board: BoardGrid
    fleet: Fleet
  }>
  ai: AiMemory
  messages: ReadonlyArray<GameMessage>
}>
