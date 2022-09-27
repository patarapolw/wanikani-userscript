interface ScriptOptions {
  RANDOMIZE_VOCABULARY_AUDIO: boolean;
  AUTOPLAY_AUDIO_IN_LESSONS: boolean;
  HIDE_SENTENCE_JA: HidingOptions;
  HIDE_SENTENCE_EN: HidingOptions;
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
}

type HidingOptions = boolean | 'remove';

interface ISentence {
  ja?: string;
  audio: string;
  en?: string;
}
