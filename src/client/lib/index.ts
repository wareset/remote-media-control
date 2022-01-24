export const isDEV: boolean = !!process.env.DEV

export const clearLocationHash = (): void => {
  location.hash = ''
}

export const last = <T>(arr: T[]): T | '' => arr[arr.length - 1] || ''

export const consoleLogDev = (...a: any[]): void => {
  isDEV && console.log(...a)
}

export const wsOnEvent = (ws: WebSocket, event: string, fn: Function): void => {
  const key = '__' + event + '__'
  if (!(key in ws)) {
    // @ts-ignore
    ws[key] = []
    ws.addEventListener(event, (e: any) => {
      if (event === 'message') {
        const message = JSON.parse(e.data)
        // @ts-ignore
        ws[key].forEach((v) => {
          v(message.cmd, message.data)
        })
      } else {
      // @ts-ignore
        ws[key].forEach((v) => {
          v(e)
        })
      }
    })
  }
  // @ts-ignore
  ws[key].push(fn)
}

export const wsOnOpen =
  (ws: WebSocket, fn: (ev: Event) => void): void => {
    wsOnEvent(ws, 'open', fn)
  }

export const wsOnClose =
  (ws: WebSocket, fn: (ev: CloseEvent) => void): void => {
    wsOnEvent(ws, 'close', fn)
  }

export const wsOnMessage =
  (ws: WebSocket, fn: (cmd: string, data: any) => void): void => {
    wsOnEvent(ws, 'message', fn)
  }
