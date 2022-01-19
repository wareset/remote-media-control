import { AddressInfo as TypeNetAddressInfo } from 'net'
import { createServer as httpCreateServer } from 'http'
import { readFileSync as fsReadFileSync } from 'fs'
import { resolve as pathResolve } from 'path'

import open from 'open'

import { isDEV } from './utils'
import { CONFIG, saveConfig } from './config'
import { DIR_ASSETS } from './dirs_and_files'

const index = fsReadFileSync(pathResolve(DIR_ASSETS, 'index.html'))
const page404 = fsReadFileSync(pathResolve(DIR_ASSETS, '404.html'))
const bundle = fsReadFileSync(pathResolve(DIR_ASSETS, 'bundle.js'))
const favicon = fsReadFileSync(pathResolve(DIR_ASSETS, 'favicon.png'))
const styles = fsReadFileSync(pathResolve(DIR_ASSETS, 'bootstrap-flatly.min.css'))

let port = -1
export const SERVER = httpCreateServer((req, res) => {
  let type = 'text/html', code = 200, data: Buffer
  switch (req.url) {
    case '':
    case '/':
      data = index
      break
    case '/favicon.png':
      data = favicon, type = 'image/png'
      break
    case '/styles.css':
      data = styles, type = 'text/css'
      break
    case '/bundle.js':
      data = bundle, type = 'application/javascript'
      break
    default:
      data = page404, code = 404, console.log('Server url: ', req.url)
  }
  res.setHeader('Content-Type', type), res.writeHead(code), res.end(data)
})
  .on('error', (err: any) => {
    console.log('Server error', err.code)
    if (err.code === 'EADDRINUSE') listenServer(0)
    else console.error(err), isDEV || process.exit()
  })
  .on('listening', () => {
    port = +(SERVER.address() as TypeNetAddressInfo).port
    console.log('Server listening. Port: ', port)

    if (port) {
      if (CONFIG.port !== (CONFIG.port = port)) saveConfig()
      isDEV || open('http://localhost:' + port + '/#modalSettingsToggle')
    } else {
      console.error(new Error('Server. Not valid port: ' + port))
      isDEV || process.exit()
    }
  })

export const listenServer = (_port = CONFIG.port): void => {
  if (port !== (port = +_port || 0)) SERVER.close(), SERVER.listen(port)
}
