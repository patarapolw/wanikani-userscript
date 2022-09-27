interface IMedia {
  url: string;
  filename: string;
  skipHash?: string;
  fields: string[];
}

interface INote<T extends INoteField = INoteFieldFull> {
  deckName: string;
  modelName: string;
  fields: Record<string, T>;
  tags: string[];
  audio?: IMedia[];
  video?: IMedia[];
  picture?: IMedia[];
}

type INoteField = string | INoteFieldFull;

interface INoteFieldFull {
  value: string;
  order: number;
}

type IAddNoteOptions =
  | {
      allowDuplicate: false;
    }
  | {
      allowDuplicate: true;
      duplicateScope: string;
      duplicateScopeOptions: {
        deckName: string;
        checkChildren: boolean;
        checkAllModels: boolean;
      };
    };

type INoteWithOptions<T extends INoteField> = INote<T> & {
  options: IAddNoteOptions;
};

/** https://foosoft.net/projects/anki-connect/ */
interface AnkiConnectActions
  extends Record<string, { params: any; result: any }> {
  // Graphical Actions

  guiBrowse: {
    params: {
      /** https://docs.ankiweb.net/searching.html */
      query: string;
    };
    /** NoteId[] */
    result: number[];
  };

  // Model Actions

  modelNames: {
    params: undefined;
    result: string[];
  };
  modelNamesAndIds: {
    params: undefined;
    result: {
      [modelName: string]: number;
    };
  };
  modelFieldNames: {
    params: {
      modelName: string;
    };
    result: string[];
  };
  modelFieldsOnTemplates: {
    params: {
      modelName: string;
    };
    result: {
      [templateName: string]: [string[], string[]];
    };
  };
  createModel: {
    params: {
      modelName: string;
      inOrderFields: string[];
      css: string;
      isCloze: boolean;
      cardTemplates: {
        Name: string;
        Front: string;
        Back: string;
      }[];
    };
    result: {
      id: string;
      name: string;
      css: string;
      flds: {
        name: string;
        ord: number;
      }[];
      tmpls: {
        name: string;
        ord: number;
        qfmt: string;
        afmt: string;
        did: null;
      }[];
      did: number;
    };
  };
  modelTemplates: {
    params: {
      modelName: string;
    };
    result: {
      [cardName: string]: {
        [side: string]: string;
      };
    };
  };
  modelStyling: {
    params: {
      modelName: string;
    };
    result: {
      css: string;
    };
  };
  updateModelTemplates: {
    params: {
      model: {
        name: string;
        templates: {
          [templateName: string]: {
            Front: string;
            Back: string;
          };
        };
      };
    };
    result: null;
  };
  updateModelStyling: {
    params: {
      model: {
        name: string;
        css: string;
      };
    };
    result: null;
  };
  findAndReplaceInModels: {
    params: {
      model: {
        modelName: string;
        findText: string;
        replaceText: string;
        front: boolean;
        back: boolean;
        css: boolean;
      };
    };
    result: number;
  };
  modelFieldRename: {
    params: {
      modelName: string;
      oldFieldName: string;
      newFieldName: string;
    };
    result: null;
  };
  modelFieldReposition: {
    params: {
      modelName: string;
      fieldName: string;
      index: number;
    };
    result: null;
  };
  modelFieldAdd: {
    params: {
      modelName: string;
      fieldName: string;
      index: number;
    };
    result: null;
  };
  modelFieldRemove: {
    params: {
      modelName: 'Basic';
      fieldName: 'Front';
    };
    result: null;
  };

  // Note Actions

  addNote: {
    params: {
      note: INoteWithOptions<string>;
    };
    /** NoteId */
    result: string;
  };
  addNotes: {
    params: {
      notes: INoteWithOptions<string>[];
    };
    /** NoteId[], will be `null` if failed */
    result: (string | null)[];
  };
  canAddNotes: {
    params: {
      notes: INoteWithOptions<string>[];
    };
    /** boolean[] */
    result: boolean[];
  };
  updateNoteFields: {
    params: {
      note: Partial<INote> & {
        id: number;
        fields: INote<string>['fields'];
        options: IAddNoteOptions;
      };
    };
    result: null;
  };
  addTags: {
    params: {
      notes: number[];
      /** space-separated */
      tags: string;
    };
    result: null;
  };
  removeTags: {
    params: {
      notes: number[];
      /** space-separated */
      tags: string;
    };
    result: null;
  };
  getTags: {
    params: undefined;
    result: string[];
  };
  findNotes: {
    params: {
      /** https://docs.ankiweb.net/searching.html */
      query: string;
    };
    /** NoteId[] */
    result: number[];
  };
  notesInfo: {
    params: {
      notes: number[];
    };
    result: (Omit<INote, 'deckName'> & {
      noteId: number;
      cards: number[];
    })[];
  };
}

interface AnkiConnectChain {
  add<A extends keyof AnkiConnectActions>(
    action: A,
    params: AnkiConnectActions[A]['params'],
  ): AnkiConnectChain;
  commit(): AnkiConnect['send'];
}

class AnkiConnect {
  public baseURL: string;
  public version: number;

  constructor(baseURL?: string, version?: number);

  send<A extends keyof AnkiConnectActions>(
    action: A,
    params: AnkiConnectActions[A]['params'],
    version?: number,
  ): Promise<AnkiConnectActions[A]['result']>;

  chain<A extends keyof AnkiConnectActions>(
    action: A,
    params: AnkiConnectActions[A]['params'],
    version?: number,
  ): AnkiConnectChain;
}

declare global {
  interface Window {
    AnkiConnect: typeof AnkiConnect;
  }
}
