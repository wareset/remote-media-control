import { execSync as cpExecSync } from 'child_process'
import {
  statSync as fsStatSync,
  existsSync as fsExistsSync,
  readFileSync as fsReadFileSync,
  writeFileSync as fsWriteFileSync
} from 'fs'

import { isWin32, isMacOS, EOL } from './utils'
import { jsonParse, jsonStringify } from './utils'
import { pathNormalizeOrAbsolutely, pathAbsolutely } from './utils'
import { FILE_CONFIG } from './dirs_and_files'

let CONFIG_FILE_STR = '{}'
export const CONFIG = {
  // Это выбранный плеер: vlc или mpv
  player    : 'vlc',
  // порт для сервера
  port      : 3000,
  // команда для запуска плеера vlc
  vlc       : 'vlc',
  // Валидна ли команда для vlc
  vlcIsValid: false,
  // команда для запуска плеера mpv
  mpv       : 'mpv',
  // Валидна ли команда для mpv
  mpvIsValid: false,
  // Список директорий, файлов и ссылок (ярлыков), разрешенных для просмотра
  library   : [
    'C:/',
    'D:/',
    '/',
    './'
  ]
}
// export declare type TypeConfig = typeof CONFIG

export const checkPlayer = (cmd: string): boolean => {
  let res = false
  if (cmd = cmd.trim()) {
    try {
      if (isWin32 || isMacOS) {
        cmd = pathAbsolutely(cmd)
        res = fsExistsSync(cmd) && !fsStatSync(cmd).isDirectory()
      } else {
        cmd = pathNormalizeOrAbsolutely(cmd)
        res = fsExistsSync(cmd) && !fsStatSync(cmd).isDirectory() ||
        !/\//.test(cmd) &&
        !!cpExecSync('command -v ' + jsonStringify(pathNormalizeOrAbsolutely(cmd)))
          .toString().replace(/\W+/ig, '')
      }
    } catch (e) {}
  }
  return res
}

export const saveConfig = (): boolean => {
  let res = false
  if (CONFIG_FILE_STR !== (CONFIG_FILE_STR = jsonStringify(CONFIG, null, 2))) {
    res = true
    console.log(EOL + 'CONFIG save:')
    console.log('-------------------------------------------------------------')
    console.log(CONFIG_FILE_STR)
    fsWriteFileSync(FILE_CONFIG, CONFIG_FILE_STR)
    console.log('-------------------------------------------------------------')
  }
  return res
}

export const readConfig = (): void => {
  if (fsExistsSync(FILE_CONFIG)) {
    const _config =
      jsonParse(CONFIG_FILE_STR = fsReadFileSync(FILE_CONFIG, 'utf8').trim())
    for (const k in _config) {
      // @ts-ignore
      if (k in CONFIG) CONFIG[k] = _config[k]
    }
  }
}

export const mendConfig = (): void => {
  // Проверка плеера
  if (!/^(vlc|mpv)$/.test(CONFIG.player)) CONFIG.player = 'vlc'

  // Проверка порта
  CONFIG.port = +CONFIG.port || 0

  // Проверка каталогов
  CONFIG.library = (CONFIG.library || []).map((v) => v.trim()).filter(Boolean)
  CONFIG.vlc = CONFIG.vlc.trim()
  CONFIG.mpv = CONFIG.mpv.trim()

  // Проверка и поиск vlc
  let vlc = CONFIG.vlc || 'vlc'
  ;[vlc, ...isWin32
    ? [
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
    ] : isMacOS
      ? ['/Applications/VLC.app/Contents/MacOS/VLC']
      : ['vlc', '/usr/bin/vlc', '/usr/local/bin/vlc']]
    .some((v) => checkPlayer(vlc = v)) || (vlc = '')
  if (CONFIG.vlcIsValid = !!vlc) CONFIG.vlc = vlc

  // Проверка и поиск mpv
  let mpv = CONFIG.mpv || 'mpv'
  ;[mpv, ...isWin32
    ? [
      'C:\\Program Files\\mpv\\mpv.exe'
    ] : isMacOS
      ? ['mpv', '/Applications/mpv.app/Contents/MacOS/mpv', '~/bin/mpv']
      : ['mpv', '/usr/bin/mpv', '/usr/local/bin/mpv']]
    .some((v) => checkPlayer(mpv = v)) || (mpv = '')
  if (CONFIG.mpvIsValid = !!mpv) CONFIG.mpv = mpv
}

export const initConfig = (): void => {
  readConfig()
  mendConfig()

  // Сохраним, если что-то изменилось
  if (!saveConfig()) {
    console.log(EOL + 'CONFIG init:')
    console.log('-------------------------------------------------------------')
    console.log(CONFIG_FILE_STR)
    console.log('-------------------------------------------------------------')
  }
}
