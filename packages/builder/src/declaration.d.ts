interface JQueryStatic {
  jStorage: {
    listenKeyChange(state: 'currentItem', cb: () => void): void
    get<T = any>(key: string): T
  }
}
