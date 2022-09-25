interface WKItemInfoState {}

type WKItemInfoCallback = (state: WKItemInfoState) => HTMLElement | undefined;

interface WKItemInfo {
  on(cond: string): WKItemInfo;
  forType(cond: string): WKItemInfo;
  under(cond: string): WKItemInfo;
  append(header: string, cb: WKItemInfoCallback): void;
  appendSubsection(header: string, cb: WKItemInfoCallback): void;
  appendAtTop(header: string, cb: WKItemInfoCallback): void;
}

declare const wkItemInfo: WKItemInfo;
