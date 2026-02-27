import type { Coord, Orientation, ShipId } from './types'

export type SetupPlaceShipAction = Readonly<{
  type: 'setup/placeShip'
  payload: {
    shipId: ShipId
    start: Coord
  }
}>

export type SetupRotateAction = Readonly<{
  type: 'setup/rotate'
  payload: {
    orientation: Orientation
  }
}>

export type PlayFireAction = Readonly<{
  type: 'play/fire'
  payload: {
    target: Coord
  }
}>

export type GameRestartAction = Readonly<{
  type: 'game/restart'
}>

export type GameClearMessagesAction = Readonly<{
  type: 'game/clearMessages'
}>

export type GameAction =
  | SetupPlaceShipAction
  | SetupRotateAction
  | PlayFireAction
  | GameRestartAction
  | GameClearMessagesAction
