import {
  resolve as pathResolve,
  dirname as pathDirname
} from 'path'

export const DIR_ASSETS = pathResolve(__dirname, 'assets')

export const DIR_CURRENT =
  process.env.DEV
    ? __dirname
    : pathDirname(process.execPath)

export const FILE_CONFIG = pathResolve(DIR_CURRENT, 'rmc.config.json')
