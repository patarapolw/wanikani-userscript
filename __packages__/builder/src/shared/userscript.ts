declare const unsafeWindow: Window['window'];
declare const exportFunction: (...args: any[]) => any;

declare function GM_xmlhttpRequest(params: {
  method: string;
  url: string;
  onload(data: { responseText: string }): void;
  onerror(e: any): void;
}): void;

export const GM = () => ({ GM_xmlhttpRequest });

export class UserScriptWindow {
  get window() {
    return (
      typeof unsafeWindow === 'undefined' ? window : unsafeWindow
    ) as Window['window'] & {
      appStoreRegistry?: any;
    };
  }

  get exportFunction() {
    return typeof exportFunction === 'undefined'
      ? (o: any) => o
      : exportFunction;
  }

  get console() {
    return this.window.console;
  }
}
