interface WKAutoplayOptions {
  HIDE_SENTENCE_JA: HidingOptions;
  HIDE_SENTENCE_EN: HidingOptions;
  NUMBER_OF_SENTENCES: number;
  IMMERSION_KIT?: Pick<WKAutoplayImmersionKit, 'priority'>;
  ANKI?: WKAutoplayAnki;
}

type WKAutoplayHidingOptions = boolean | 'remove';

interface WKAutoplayImmersionKit {
  priority: string[];
  availableDecks: string[];
  user: {
    [vocab: string]: ImmersionKitExample[];
  };
  list(vocab?: string): ImmersionKitExample[];
  set(sentence_id: string, vocab?: string): ImmersionKitExample | null;
  autoplay(sentence_id: string, vocab?: string): ImmersionKitExample | null;
  _lookup: {
    [vocab: string]: ImmersionKitExample[];
  };
}

interface WKAutoplayAnki {
  query: string;
  searchFields: {
    vocabulary: string[];
    reading: string[];
  };
  outFields: {
    sentence: (Partial<ISentence> & Required<Pick<ISentence, 'audio'>>)[];
  };
}

interface WKAutoplaySentence {
  id: string;
  ja?: string;
  audio: string;
  en?: string;
}

interface WKAutoplayObject extends WKAutoplayOptions {
  IMMERSION_KIT?: WKAutoplayImmersionKit;
  load(s?: WKAutoplayOptions): WKAutoplayObject;
  save(): void;
  reset(): WKAutoplayObject;
  dump(): WKAutoplayOptions;
}
