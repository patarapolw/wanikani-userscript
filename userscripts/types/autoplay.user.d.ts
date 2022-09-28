interface ScriptOptions {
  HIDE_SENTENCE_JA: HidingOptions;
  HIDE_SENTENCE_EN: HidingOptions;
  NUMBER_OF_SENTENCES: number;
  IMMERSION_KIT?: {
    priority: string[];
  };
  ANKI?: {
    model: string;
    searchFields: {
      vocabulary: string[];
      reading: string[];
    };
    outFields: {
      sentence: ISentence[];
    };
  };
  LOG: {
    immersionKit?: boolean;
  };
}

type HidingOptions = boolean | 'remove';

interface ISentence {
  ja?: string;
  audio: string;
  en?: string;
}
