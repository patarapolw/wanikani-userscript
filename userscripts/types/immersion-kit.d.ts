interface ImmersionKitExample {
  category: string;
  deck_name: string;
  sentence: string;
  id: number;
  sentence_id: string;
  sound_url: string;
  tags: string[];
  translation: string;
  word_index: number[];
}

interface ImmersionKitResult {
  data: [
    {
      examples: ImmersionKitExample[];
    },
  ];
}
