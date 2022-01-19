import { createVLC } from './vlc'
import { createMPV } from './mpv'
import { CONFIG } from '../config'
import { TypePlayer, TypePromise } from '../types'

let PLAYER: TypePlayer | null
let playerCmd: string
let playerType: 'vlc' | 'mpv'
const PLAYERS = { vlc: createVLC, mpv: createMPV }

export const createPlayer = (playlist: string[], callback: (isErr: boolean) => void): TypePlayer => {
  let noop!: () => TypePromise
  if (playerType !== CONFIG.player || playerCmd !== CONFIG[CONFIG.player]) {
    if (PLAYER) PLAYER.kill()

    // @ts-ignore
    playerType = CONFIG.player, playerCmd = CONFIG[CONFIG.player]
    // @ts-ignore
    if (!CONFIG[CONFIG.player + 'IsValid']) {
      PLAYER = null, callback(true)
      noop = (): TypePromise => Promise.resolve((callback(true), void 0))
    } else {
      // @ts-ignore
      PLAYER = PLAYERS[playerType](playerCmd, playlist, callback)
    }
  }
  return PLAYER || {
    kill: noop,
    stat: noop,
    
    playlist: noop,
    
    playfile: noop,
    playbyid: noop,
    
    appendfile: noop,
    deletebyid: noop,
    
    pause: noop,
    stop : noop,
    next : noop,
    prev : noop,
    empty: noop,
    
    random: noop,
    loop  : noop,
    
    fullscreen: noop,
    
    volume: noop,
    seek  : noop
  }
}
