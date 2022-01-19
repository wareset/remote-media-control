import { Server as httpServer } from 'http'
import {
  Stats as fsStats,
  promises as fsPromises,
  statSync as fsStatSync,
  existsSync as fsExistsSync
} from 'fs'
import {
  join as pathJoin,
  resolve as pathResolve,
  basename as pathBasename
} from 'path'

import ws from 'ws'
// import mime from 'mime/lite'

import { createPlayer } from './player'
import { pathAbsolutely } from './utils'
import { SERVER, listenServer } from './server'
import { TypePlayer, TypePromise } from './types'
import { jsonParse, jsonStringify } from './utils'
import { isDEV, getRouterAddress, EOL } from './utils'
import { CONFIG, mendConfig, saveConfig, checkPlayer } from './config'

const fsPromisesStat = fsPromises.stat
const fsPromisesReaddir = fsPromises.readdir

// @ts-ignore
let SOCKET!: ws.Server
let PLAYER!: TypePlayer

const isCorrectMime = (_v: string | null): boolean => true
//- !!_v && /^(?:audio|video|image)/.test(mime.getType(_v) || '')

const send = (ws: ws, cmd: string, data: any): void => {
  ws.send(jsonStringify({ cmd, data }))
}

let home: { [key: string]: string } = {}
let homeStr: string = ''
const libraryChangeStr = jsonStringify({ cmd: 'libraryChange' })
const createHome = (): void => {
  const homeNew: any = {}
  const list: { id: number, type: 'd' | 'f', name: string }[] = []

  // @ts-ignore
  for (let file: string, _stats: fsStats, isDir: boolean,
    i = 0; i < CONFIG.library.length; ++i) {
    try {
      if (fsExistsSync(file = pathAbsolutely(CONFIG.library[i]))) {
        if ((isDir = (_stats = fsStatSync(file)).isDirectory()) ||
        isCorrectMime(file)) {
          // console.log(111, stats)
          list.push({
            id  : i,
            type: isDir ? 'd' : 'f',
            name: pathBasename(file).trim() || file
          })
          homeNew[i] = file
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
  console.log(EOL + 'Directories:')
  console.log('---------------------------------------------------------------')
  console.log(jsonStringify(homeNew, null, 2))
  console.log('---------------------------------------------------------------')

  // console.log(list)
  const homeStrNew = jsonStringify({
    cmd : 'library',
    data: { id: -1, path: [], list }
  })

  home = homeNew
  if (homeStr !== (homeStr = homeStrNew)) {
    for (const ws of SOCKET.clients) ws.send(libraryChangeStr)
  }
}

const createDir =
  (data: { id: number, path: string[] }): string => {
    const id = +data.id
    const dir = pathResolve(home[id], ...data.path.slice(1))
    // TODO: Это проверка, что директория не вышла из разрешшенной
    if (dir.indexOf(home[id]) !== 0) throw new Error('Not valid path: ' + dir)
    return dir
  }

const errorPermissionDenied = (
  ws: ws.WebSocket,
  data: { id: number, path: string[] }
): void => {
  send(ws, 'messageError', 'Permission denied: ' + (pathJoin(...data.path) || '/'))
}

const errorNotFoundDirectory = (
  ws: ws.WebSocket,
  data: { id: number, path: string[] }
): void => {
  send(ws, 'messageError', 'Not found directory: ' + (pathJoin(...data.path) || '/'))
}

const errorNotValidDirectory = (
  ws: ws.WebSocket,
  data: { id: number, path: string[] }
): void => {
  send(ws, 'messageError', 'Not valid directory: ' + (pathJoin(...data.path) || '/'))
}

const sendLibrary = async (
  ws: ws.WebSocket,
  data: { id: number, path: string[] }
): TypePromise => {
  const id = +data.id
  const dataPath = data.path
  if (!dataPath.length || !(id in home)) return void ws.send(homeStr)

  try {
    const dir = createDir(data)
    try {
      if ((await fsPromisesStat(dir)).isDirectory()) {
        try {
          const list: any[] = []
          const listFiles: any[] = []
          const a = await fsPromisesReaddir(dir, { withFileTypes: true })
          let isDir: boolean
          for await (const dirent of a) {
            if ((isDir = dirent.isDirectory() || dirent.isSymbolicLink() &&
              (await fsPromisesStat(pathJoin(dir, dirent.name))).isDirectory()) ||
              isCorrectMime(dirent.name)) {
              (isDir ? list : listFiles).push({
                id,
                type: isDir ? 'd' : 'f',
                name: dirent.name
              })
            }
          }
          list.push(...listFiles)
          send(ws, 'library', { id, path: data.path, list })
        } catch (e) {
          // TODO: Если каталог недоступен (например нет прав)
          isDEV && console.log(e)
          errorPermissionDenied(ws, data)
        }
      }
    } catch (e) {
      // TODO: Если каталог удален или переименован
      isDEV && console.log(e)
      errorNotFoundDirectory(ws, data)
      if (dataPath.length === 1) createHome()
      dataPath.pop(), sendLibrary(ws, { id, path: dataPath })
    }
  } catch (e) {
    // TODO: Директория вышла за пределы разрешеной
    isDEV && console.log(e)
    errorNotValidDirectory(ws, data)
  }
}

const playerAppendFile = async (
  ws: ws.WebSocket,
  data: { id: number, path: string[] }
): TypePromise => {
  try {
    const dir = createDir(data)
    try {
      if (await fsPromises.stat(dir)) {
        try {
          await PLAYER.appendfile(dir)
          await playlistUpdate()
        } catch (e) {
          // TODO: Ошибка плеера
          console.error(e)
        }
      }
    } catch (e) {
      // TODO: Если каталог удален или переименован
      isDEV && console.log(e)
      errorNotFoundDirectory(ws, data)
    }
  } catch (e) {
    // TODO: Директория вышла за пределы разрешеной
    isDEV && console.log(e)
    errorNotValidDirectory(ws, data)
  }
}

let playlistStr = ''
const playlistUpdate = async (): TypePromise => {
  const playlist = await PLAYER.playlist() || []
  if (playlistStr !== (playlistStr = jsonStringify({
    cmd : 'playlist',
    data: playlist
  }))) {
    for (const ws of SOCKET.clients) ws.send(playlistStr)
    setTimeout(playlistUpdate, 2500)
    playerStatUpdate()
    return true
  }
  return false
}

let playerStatId = NaN
let playerStatStr = ''
let playerStatCTO: any
const playerStatUpdate = async (): TypePromise => {
  clearTimeout(playerStatCTO)
  const stat = await PLAYER.stat()
  // eslint-disable-next-line require-atomic-updates
  if (SOCKET.clients.size) playerStatCTO = setTimeout(playerStatUpdate, 1000)
  if (stat) {
    if (playerStatStr !== (playerStatStr = jsonStringify({
      cmd : 'playerStat',
      data: stat
    }))) {
      for (const ws of SOCKET.clients) ws.send(playerStatStr)
      if (playerStatId !== (playerStatId = stat.id)) playlistUpdate()
      return true
    }
  }
  return false
}

const PLAYLIST_FILES: string[] = []
const playerMessage = (isErr: boolean): void => {
  let mStr: string
  if (isErr) {
    mStr = jsonStringify({ cmd: 'messageError', data: 'Ошибка плеера' })
  } else {
    mStr = jsonStringify({ cmd: 'messageSuccess', data: 'Плеер подключен' })
    ;[...PLAYLIST_FILES].forEach((v) => {
      if (v) PLAYER.appendfile(decodeURIComponent(v))
    })
  }
  for (const ws of SOCKET.clients) ws.send(mStr)
}

export const createSocket = (server: httpServer = SERVER): void => {
  SOCKET = new ws.Server({ server })
    .on('close', () => {
      console.log('SocketServer close')
    })
    .on('error', (err) => {
      console.log('SocketServer error: ', err)
    })
  // .on('listening', () => {
  //   console.log('SocketServer listening')
  // })
    .on('connection', (ws, req) => {
      console.log('SocketServer connection: ', req.socket.remoteAddress)
      playerStatUpdate().then((v) => {
        if (!v) playerStatStr && ws.send(playerStatStr)
      })

      ws
        .on('close', (code, _reason) => {
          console.log('WebSocket close: ', code)
        })
        .on('error', (err) => {
          console.log('WebSocket error: ', err)
        })
        .on('message', (_data) => {
          const { cmd, data } = jsonParse(_data.toString())
        
          switch (cmd) {
            // PLAYER BEGIN
            case 'playerAppendFile':
              playerAppendFile(ws, data)
              break
            case 'playlistGet':
              playlistUpdate().then((v) => {
                if (!v) playlistStr && ws.send(playlistStr)
              })
              break
            case 'playlistPlayById':
              PLAYER.playbyid(data).then(playlistUpdate)
              break
            case 'playlistDeleteById':
              PLAYER.deletebyid(data).then(playlistUpdate)
              break
            case 'playlistClear':
              PLAYER.empty().then(playlistUpdate)
              break
            case 'playerLoop':
              PLAYER.loop().then(playerStatUpdate)
              break
            case 'playerRandom':
              PLAYER.random().then(playerStatUpdate)
              break
            case 'playerFullscreen':
              PLAYER.fullscreen().then(playerStatUpdate)
              break
            case 'playerPrev':
              PLAYER.prev().then(playerStatUpdate)
              break
            case 'playerPause':
              PLAYER.pause().then(playerStatUpdate)
              break
            case 'playerNext':
              PLAYER.next().then(playerStatUpdate)
              break
            case 'playerVolume':
              PLAYER.volume(data).then(playerStatUpdate)
              break
            case 'playerSeek':
              PLAYER.seek(data).then(playerStatUpdate)
              break
              // PLAYER END

            // LIBRARY BEGIN
            case 'library':
              sendLibrary(ws, data)
              break
              // LIBRARY END

            // ROUTER IP BEGIN
            case 'routerGet':
              send(ws, 'router', getRouterAddress())
              break
              // ROUTER IP END

            // SETTINGS BEGIN
            case 'settingsGet':
              send(ws, 'settings', CONFIG)
              break
            case 'settingsCheckVlc':
              send(ws, 'settingsCheckVlc', checkPlayer(data))
              break
            case 'settingsCheckMpv':
              send(ws, 'settingsCheckMpv', checkPlayer(data))
              break
            case 'settingsSet':
              CONFIG.port = +data.port || 0
              CONFIG.player = data.player || CONFIG.player
              if (!CONFIG.vlcIsValid || checkPlayer(data.vlc)) CONFIG.vlc = data.vlc
              if (!CONFIG.mpvIsValid || checkPlayer(data.mpv)) CONFIG.mpv = data.mpv
              CONFIG.library = data.library.split('\n')
                .map((v: string) => v.trim())
                .filter(Boolean)
              mendConfig()
              if (saveConfig()) {
                listenServer(), createHome()
                PLAYER = createPlayer(PLAYLIST_FILES, playerMessage)
              }
              break
              // SETTINGS END
          
            // EXIT BEGIN
            case 'exit':
              PLAYER.kill()
              server.close()
              process.exit(1)
              break
              // EXIT END
                
            default:
              console.log('WebSocket message: ', _data.toString())
          }
        })
    })
  createHome()
  PLAYER = createPlayer(PLAYLIST_FILES, playerMessage)
}
