import { createServer as netCreateServer, Server as netServer } from 'net'
import { stringify as qsStringify } from 'querystring'
import { basename as pathBasename } from 'path'
import { get as httpGet } from 'http'

import {
  exec as cpExec,
  spawn as cpSpawn,
  ChildProcess as cpChildProcess
} from 'child_process'

import { jsonParse, jsonStringify } from '../utils'
import { isDEV, isWin32, createZipCode } from '../utils'
import { TypePlayer, TypePromise, TypePromiseResolve, TypePromiseReject } from '../types'

const pass = '' + createZipCode()
// https://wiki.videolan.org/VLC_HTTP_requests
export const createVLC = (
  cmd: string,
  playlistFiles: string[],
  callback: (isErr: boolean) => void
): TypePlayer => {
  let port = 9090
  const options =
    ['--intf', 'http', '-f', '--http-port', '' + port, '--http-password', pass]
  const taskcmd = jsonStringify(pathBasename(cmd!))

  let isKill = false
  let player: cpChildProcess | null
  const queue: [string, TypePromiseResolve, TypePromiseReject][] = []

  const forceClose = (): void => {
    isReady = false
    const _p = player
    player = null
    if (_p) {
      callback(true)
      try {
        cpExec(isWin32 ? `taskkill /IM ${taskcmd} /F` : `killall -9 ${taskcmd}`)
      } catch (e) {
        isDEV && console.error(e)
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

  let isReady = false
  let netServer: netServer | null
  const startVLC = (): void => {
    if (!netServer) {
      netServer = netCreateServer()
        .once('close', () => {
          netServer = null
          player = cpSpawn(cmd!, options)
            .once('error', (e) => {
              console.error('VLC_PALYER: error', e)
              forceClose()
            })
            .once('close', (e) => {
              console.log('VLC_PALYER: close', e)
              forceClose()
            })
          setTimeout(execute, 2500)
        })
        .listen(0, () => {
          if (netServer) {
            // @ts-ignore
            options[4] = '' + (port = netServer.address().port)
            isDEV && console.log('VLC_PALYER init: ', cmd, options)
            netServer.close()
          }
        })
    }
  }
  
  const execute = (): void => {
    if (queue.length && !isKill) {
      if (!player) {
        startVLC()
      } else {
        const [command, resolve, reject] = queue[0]
        if (!isReady) isReady = true, callback(false)
      
        httpGet({
          port,
          auth: ':' + pass,
          path: '/requests/' + command
        }, (res) => {
          if (res.statusCode === 200) {
            let result = ''
            res
              .on('data', (data) => {
                result += data.toString()
              })
              .on('end', () => {
                try {
                  resolve(jsonParse(result))
                } catch (e) {
                  console.log(result)
                  reject(e)
                }
              })
          } else {
            reject(new Error(res.statusCode + ': ' + res.statusMessage))
          }
  
          queue.shift()
          if (queue.length) execute()
        }).on('error', (e) => {
          isDEV && console.log('error', e)
          isReady = false
          // callback(true)
          // setTimeout(execute, 500)
        })
      }
    }
  }

  const addInQueue = (
    command: string, resolve: TypePromiseResolve, reject: TypePromiseReject
  ): void => {
    queue.push([command, resolve, reject]), execute()
  }

  const _run = (command: string, query?: {[key: string]: any}): TypePromise =>
    new Promise((resolve) => {
      if (command) {
        command = '?command=' + command
        let args: string
        if (query && (args = qsStringify(query))) command += '&' + args
      }
      addInQueue('status.json' + command, resolve, (e) => {
        // callback(true)
        console.error(e)
        resolve(void 0)
      })
    })

  const api: TypePlayer = {
    // _run,
    kill,
    // ?????????????? ????????????????????
    stat: (): TypePromise =>
      _run('').then((v) => ({
        id        : +v.currentplid,
        play      : v.state === 'playing',
        loop      : !!v.loop,
        random    : !!v.random,
        volume    : +v.volume / 256 * 100,
        seek      : +v.position * 100,
        fullscreen: !!v.fullscreen
        // _origin   : v
      })),

    // ?????????????? ????????????????
    playlist: (): TypePromise =>
      new Promise((resolve, reject) => {
        addInQueue('playlist.json', resolve, reject)
      }).then((data: any) => (playlistFiles.length = 0,
      data.children[0].children.map((v: any) => (
        playlistFiles.push(v.uri && /^file:\/\//.test(v.uri) ? v.uri.slice(7) : ''),
        {
          id      : +v.id,
          current : !!v.current,
          duration: +v.duration || 0,
          name    : v.name
        }
      )))).catch((e) => {
        callback(true)
        console.error(e)
      }),

    // ???????????????? ???????? ?? ???????????????? ?? ????????????????
    playfile: (input: string): TypePromise => _run('in_play', { input }),
    // ???????????????? ???????? ???? ??????????????????
    playbyid: (id: number | string): TypePromise => _run('pl_play', { id }),

    // ???????????????? ?? ????????????????
    appendfile: (input: string): TypePromise => _run('in_enqueue', { input }),
    // ?????????????? ???? ??????????????????
    deletebyid: (id: number | string): TypePromise => _run('pl_delete', { id }),

    // ??????????. ??????/????????
    pause: (): TypePromise => _run('pl_pause'),
    // ??????????
    stop : (): TypePromise => _run('pl_stop'),
    // ?????????????????? ????????
    next : (): TypePromise => _run('pl_next'),
    // ???????????????????? ????????
    prev : (): TypePromise => _run('pl_previous'),
    // ???????????????? ????????????????
    empty: (): TypePromise => _run('pl_empty'),

    // ????????????????. ??????/????????
    random: (): TypePromise => _run('pl_random'),
    // ???? ??????????. ??????/????????
    loop  : (): TypePromise => _run('pl_loop'),

    // ???? ???????? ??????????. ??????/????????
    fullscreen: (): TypePromise => _run('fullscreen'),

    // ??????????????????. ???????????????????? ?? ??????????????????
    volume: (val: number | string): TypePromise =>
      _run('volume', { val: +val / 100 * 256 | 0 }),
    // ??????????????. ???????????????????? ?? ??????????????????
    seek: (val: number | string): TypePromise =>
      _run('seek', { val: (+val | 0) + '%' })
  }

  return api
}
