/* eslint-disable new-cap */
import { Socket as netSocket } from 'net'
import path from 'path'
// import events from 'events'
import cp from 'child_process'
import { isWin32 } from '../utils'
import { jsonParse, jsonStringify } from '../utils'
import { TypePlayer, TypePromise, TypePromiseResolve, TypePromiseReject } from '../types'

// https://mpv.io/manual/master/#json-ipc
export const createMPV = (
  cmd: string,
  playlistFiles: string[],
  callback: (isErr: boolean) => void
): TypePlayer => {
  const mpvsocket = (isWin32 ? '\\\\.\\pipe\\' : '/tmp/') + 'rmc.mpv.socket'
  const options = ['--idle', '--fs', '--no-config', '--input-ipc-server=' + mpvsocket]
  const taskcmd = jsonStringify(path.basename(cmd!))
  const command = cmd + ' ' + options.join(' ')

  let loop = false
  let random = false
  let volume = 100

  let isKill = false
  let player: cp.ChildProcess | null, socket: netSocket | null

  const forceClose = (): void => {
    isReady = false
    const _s = socket
    const _p = player
    player = socket = null
    if (_s) _s.destroy()
    if (_p) {
      callback(true)
      try {
        cp.exec(isWin32 ? `taskkill /IM ${taskcmd} /F` : `killall -9 ${taskcmd}`)
      } catch (e) {
        console.error(e)
      }
      _p.kill(0)
    }
  }
  const kill = (): void => {
    isKill = true
    forceClose()
  }
  process.on('SIGTERM', kill)
  process.on('beforeExit', kill)
  process.on('exit', kill)

  // const emitter = new events.EventEmitter()
  const queue: [any[], TypePromiseResolve, TypePromiseReject][] = []
  const requests: { [key: string]: [any[], TypePromiseResolve, TypePromiseReject] } = {}

  const connect = (_player: cp.ChildProcess) => (): void => {
    socket && _player === player && socket.connect(mpvsocket)
  }

  // const fixconnect = (): void => {
  //   if (!isKill) setTimeout(fixconnect, 1000 * 10)
  //   if (isReady) api.volume(volume)
  // }
  // setTimeout(fixconnect, 1000 * 30)

  let attempts = 0
  let isReady = false
  const startSocket = (_player: cp.ChildProcess) => (): void => {
    socket = new netSocket()
      .setEncoding('utf8')
      .on('close', (e) => {
        console.log('MPV_SOCKET: close', e)
        forceClose()
      })
      .on('error', (e) => {
        if (_player === player && ++attempts < 10) {
          setTimeout(connect(_player), 500 * attempts)
        } else {
          console.log('MPV_SOCKET: error', e)
          forceClose()
        }
      })
      .on('ready', () => {
        console.log('MPV_SOCKET: ready')
        isReady = true, callback(false)

        setTimeout(() => {
          api.volume(volume)
          random = !random, api.random()
          loop = !loop, api.loop()
          execute()
        }, 500)
      })
      .on('data', (data) => {
        data.toString()
          .split(/\r?\n/g)
          .forEach((v) => {
            if (v = v.trim()) {
              const p: any = jsonParse(v)

              if (p.request_id && p.request_id in requests) {
                const [args, resolve, reject] = requests[p.request_id]
                delete requests[p.request_id]

                p.error === 'success'
                  ? resolve(p.data)
                  : reject(new Error(p.error + jsonStringify(args)))
              }
              // console.log(p)
              
              // else if (p.event) {
              //   emitter.emit(p.event, v)
              // } else {
              //   emitter.emit('data', v)
              // }
            }
          })
      })
    setTimeout(connect(_player), 2500)
  }

  const startMPV = (): void => {
    attempts = 0
    console.log('MPV_PALYER: create: ', command)
    player = cp.spawn(cmd!, options)
      .once('error', (e) => {
        console.error('MPV_PALYER: error: ', e)
        forceClose()
      })
      .once('close', (e) => {
        console.log('MPV_PALYER: close: ', e)
        forceClose()
      })
    startSocket(player!)()
  }

  let request_id = 0
  const execute = (): void => {
    if (queue.length && !isKill) {
      if (!player) {
        startMPV()
      } else if (isReady) {
        const data = queue.shift()!

        if (request_id > 100) request_id = 1
        else ++request_id
        const message = jsonStringify({ request_id, command: data[0] }) + '\n'
        if (socket!.write(message)) {
          if (request_id in requests) {
            requests[request_id][2](new Error('' + requests[request_id][0]))
          }
          requests[request_id] = data
        } else data[2](new Error('' + data[0]))

        if (queue.length) execute()
      }
    }
  }

  const _run = (...args: any[]): TypePromise =>
    new Promise((resolve) => {
      queue.push([args, resolve, (e): void => {
        // callback(true)
        console.error(e)
        resolve(void 0)
      }]), execute()
    })
  const _set = (...args: any[]): TypePromise => _run('set_property', ...args)
  const _get = (...args: any[]): TypePromise => _run('get_property', ...args)

  const last = <T>(arr: T[]): T => arr[arr.length - 1]

  const api: TypePlayer = {
    // _run,
    // _set,
    // _get,
    // on: (...args) => emitter.on(...args),
    kill,

    stat: (): TypePromise =>
      Promise.all([
        _get('playlist'),
        _get('pause'),
        _get('loop-playlist'),
        _get('shuffle'),
        _get('volume'),
        _get('percent-pos'),
        _get('fullscreen')
      ])
        .then(([_playlist, _pause, _loop, _shuffle, _volume, _seek, _fullscreen]) => {
          let id = -1, playing = false
          if (_playlist) {
            for (let i = 0; i < _playlist.length; ++i) {
              if (_playlist[i].current) {
                id = i,
                playing = !!_playlist[i].playing
                break
              }
            }
          }

          return {
            id        : id,
            play      : playing && !_pause,
            loop      : loop = _loop === 'inf',
            random    : random, // = !!_shuffle,
            volume    : volume = +_volume || 0,
            seek      : +_seek || 0,
            fullscreen: !!_fullscreen
          }
        }),

    playlist: (): TypePromise =>
      _get('playlist').then((data) => (
        playlistFiles.length = 0,
        data.map((v: any, k: number) => (
          playlistFiles.push(v.filename || ''),
          {
            id      : k,
            current : !!v.current || 0,
            duration: +v.duration,
            name    : v.title || last(v.filename.split(/[/\\]+/))
          }
        )))),

    playfile: (input: string): TypePromise =>
      _run('loadfile', input, 'append')
        .then((v) => _run('playlist-play-index', (v || {}).playlist_entry_id - 1 || 0)),
    playbyid: (id: number | string): TypePromise =>
      _run('playlist-play-index', id).then(() => _set('pause', false)),

    appendfile: (input: string): TypePromise =>
      _run('loadfile', input, 'append'),
    deletebyid: (id: number | string): TypePromise =>
      _run('playlist-remove', id),

    pause: (): TypePromise =>
      _run('cycle', 'pause'),
    stop: (): TypePromise =>
      _run('stop'),
    next : (): TypePromise => _run('playlist-next'),
    // .then((v) => v || api.loop().then(() => api.next().then(api.loop))),
    prev : (): TypePromise => _run('playlist-prev'),
    // .then((v) => v || api.loop().then(() => api.prev().then(api.loop))),
    empty: (): TypePromise =>
      _run('stop'), // playlist-clear

    random: (): TypePromise =>
      _run((random = !random) ? 'playlist-shuffle' : 'playlist-unshuffle'),
    loop: (): TypePromise =>
      _set('loop-playlist', (loop = !loop) ? 'inf' : 'no'),

    fullscreen: (): TypePromise =>
      _run('cycle', 'fullscreen'),

    volume: (val: number | string): TypePromise =>
      _set('volume', volume = +val | 0),
    seek: (val: number | string): TypePromise =>
      _set('percent-pos', +val | 0)
  }

  return api
}
