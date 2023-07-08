type AuxiliaryType = 'whitelist' | 'blacklist' | 'warn';

interface EvaluationParam {
  questionType: string;
  item: {
    type: string;
    characters: string;
    kunyomi?: string[];
    onyomi?: string[];
    nanori?: string[];
    readings?: string[];
    auxiliary_readings?: {
      reading: string;
      type: AuxiliaryType;
    }[];
    meanings: string[];
    auxiliary_meanings: {
      meaning: string;
      type: AuxiliaryType;
    }[];
    subject_category: string;
    primary_reading_type?: string;
  };
  userSynonyms: string[];
  response: string;
}

interface Evaluation {
  action: 'pass' | 'fail' | 'retry';
  message: null | {
    text: string;
    type: 'itemInfoException' | 'answerException';
  };
}

type EvaluationFunction = (e: EvaluationParam) => Evaluation;
type TryEvaluationFunction = (
  e: EvaluationParam,
  check: EvaluationFuction,
) => Evaluation | null;

class ModAnswerChecker {
  mods: TryEvaluationFunction[];
  answerChecker: {
    oldEvaluate?: EvaluationFunction;
    evaluate: EvaluationFunction;
  } | null;

  register(fn: TryEvaluationFunction): void;
}

interface Window {
  modAnswerChecker: ModAnswerChecker;
}
