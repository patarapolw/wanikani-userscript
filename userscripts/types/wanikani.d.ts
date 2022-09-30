import 'jquery';
import 'jStorage';

type WKType = 'radical' | 'kanji' | 'vocabulary';
type WKQuestionType = 'reading' | 'meaning';

type WKCurrent<T extends WKType> = {
  id: number;
  slug: string;
  en: string[];
} & (T extends 'radical'
  ? {
      rad: string;
    }
  : {}) &
  (T extends 'kanji'
    ? {
        kan: string;
      }
    : {}) &
  (T extends 'vocabulary'
    ? {
        kan: { kan: string }[];
        aud: {
          content_type: string;
          pronunciation: string;
          url: string;
          voice_actor_id: number;
        }[];
        voc: string;
        kana: string[];
      }
    : {});

declare global {
  interface JStorageStatic {
    get(key: 'currentItem'): WKCurrent<any> | undefined;
    get(key: 'activeQueue'): WKCurrent<any> | undefined;
    get(key: 'questionCount'): number | undefined;
    get(key: 'completedCount'): number | undefined;
    get(key: 'questionType'): WKQuestionType | undefined;

    get(key: 'l/currentLesson'): WKCurrent<any> | undefined;
  }

  interface Window {
    unsafeWindow?: Window;
    console: Console;

    audioAutoplay: boolean;
  }
}
