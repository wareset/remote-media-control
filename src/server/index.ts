import { isDEV, EOL } from './lib/utils'
// @ts-ignore
import { name } from '../../package.json'
import { initConfig } from './lib/config'
import { listenServer } from './lib/server'
import { createSocket } from './lib/socket'

isDEV || console.clear()
// Это чтобы Chrome inspect 100% запускался
isDEV && setTimeout(() => {}, 1000 * 60 * 60)
console.log(EOL + EOL + 'START ' + name.toUpperCase())

initConfig()
createSocket()
listenServer()
