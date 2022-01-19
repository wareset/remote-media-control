import { networkInterfaces as osNetworkInterfaces } from 'os'
import {
  resolve as pathResolve,
  normalize as pathNormalize
} from 'path'

import { DIR_CURRENT } from './dirs_and_files'

export { EOL } from 'os'

export const isDEV = process.env.DEV

export const isWin32 = process.platform === 'win32'
export const isMacOS = process.platform === 'darwin'

export const jsonStringify = JSON.stringify
export const jsonParse = JSON.parse

export const pathAbsolutely =
  (v: string): string => pathResolve(DIR_CURRENT, pathNormalize(v))
  
export const pathNormalizeOrAbsolutely =
  (v: string): string => v[0] === '.' ? pathAbsolutely(v) : pathNormalize(v)

export const getRouterAddress = (): string => {
  const ni = osNetworkInterfaces()
  for (const k in ni) {
    if (ni[k]) {
      for (const d of ni[k]) {
        if (!d.internal && /^192\.168\.\d+\.\d+$/.test(d.address)) return d.address
      }
    }
  }
  return ''
}

export const createZipCode = (): number => {
  const r = (Math.random() * 1e9 + '').slice(0, 4)
  return r.length === 4 ? +r : createZipCode()
}
