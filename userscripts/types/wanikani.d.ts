import 'jquery'
import 'jStorage'

type WKType = 'radical' | 'kanji' | 'vocabulary'

type WKCurrent<T extends WKType> = {
  id: number;
  slug: string;
  en: string[];
} & (T extends 'radical' ? {
  rad: string
} : {}) & (T extends 'kanji' ? {
  kan: string;
} : {}) & (T extends 'vocabulary' ? {
  kan: {kan: string}[];
  aud: {
    content_type: string;
    pronunciation: string;
    url: string;
    voice_actor_id: number
  }[]
  voc: string
  kana: string[]
} : {})

declare global {
  interface JStorageStatic {
    get(key: 'currentItem'): WKCurrent<any> | undefined
  }

  interface Window {
    unsafeWindow?: Window;
    console: Console;
  }
}
