// https://community.wanikani.com/t/for-userscript-authors-wk-item-info-injector/53823

type WKType = import('./wanikani').WKType

type WKItemInfoOn = 'lesson' | 'lessonQuiz' | 'review' | 'extraStudy' | 'itemPage'

interface WKItemInfoState<T> {
  on: WKItemInfoOn
  type: T extends WKType ? T : WKType
  under: string[]
  hiddenSpoiler: string[]
  id: number
  meaning: string[]
  characters: string
  reading: string[]
}

type WKItemInfoCallback<R, T> = (state: WKItemInfoState<T>) => R;
type WKItemInfoCallbackHTML<T> = WKItemInfoCallback<HTMLElement | undefined, T>

interface WKItemInfo<T extends string = string> {
  forType<T1 extends T>(cond: T1): WKItemInfo<T1>;

  on(cond: string): WKItemInfo<T>;
  under(cond: string): WKItemInfo<T>;

  notify(cb: WKItemInfoCallback<void, T>): void;
  append(header: string, cb: WKItemInfoCallbackHTML<T>): void;
  appendSubsection(header: string, cb: WKItemInfoCallbackHTML<T>): void;
  appendAtTop(header: string, cb: WKItemInfoCallbackHTML<T>): void;
}

declare const wkItemInfo: WKItemInfo;
