export declare type TypePromise<T = any> = Promise<T>
export declare type TypePromiseResolve = (value: unknown) => void
export declare type TypePromiseReject = (reason?: any) => void

export declare type TypePlayer = {
  kill: () => any
  // Вывести информацию
  stat: () => TypePromise<{
    id: number
    play: boolean
    loop: boolean
    random: boolean
    volume: number
    seek: number
    fullscreen: boolean
  } | undefined>
  // Вывести плейлист
  playlist: () => TypePromise<{
    id: number,
    current: boolean
    duration: number
    name: string
    path: string
  }[] | undefined>

  // Включить трек и добавить в плейлист
  playfile: (input: string)=> TypePromise
  // Включить трек из плейлиста
  playbyid: (id: number | string) => TypePromise

  // Добавить в плейлист
  appendfile: (input: string) => TypePromise
  // Удалить из плейлиста
  deletebyid: (id: number | string) => TypePromise

  // Пауза. вкл/выкл
  pause: () => TypePromise
  // Сброс
  stop : () => TypePromise
  // Следующий трек
  next : () => TypePromise
  // Предыдущий трек
  prev : () => TypePromise
  // Очистить плейлист
  empty: () => TypePromise

  // Случайно. вкл/выкл
  random: () => TypePromise
  // По кругу. вкл/выкл
  loop: () => TypePromise

  // На весь экран. вкл/выкл
  fullscreen: () => TypePromise

  // Громкость. Абсолютная в процентах
  volume: (val: number | string) => TypePromise
  // Позиция. Абсолютная в процентах
  seek: (val: number | string) => TypePromise
}
