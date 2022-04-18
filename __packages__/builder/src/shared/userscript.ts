declare global {
  interface Window {
    appStoreRegistry?: any
  }
}

declare function GM_xmlhttpRequest(params: {
  method: string
  url: string
  onload(data: { responseText: string }): void
  onerror(e: any): void
}): void

export const GM = () => ({ GM_xmlhttpRequest })
