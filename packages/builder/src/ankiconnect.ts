export interface IMedia {
  url: string;
  filename: string;
  skipHash?: string;
  fields: string[];
}

export interface INote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
  audio?: IMedia[];
  video?: IMedia[];
  picture?: IMedia[];
}

export type IAddNoteOptions =
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

export type INoteWithOptions = INote & {
  options: IAddNoteOptions;
};

/** https://foosoft.net/projects/anki-connect/ */
export interface AnkiConnectActions
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
      note: INoteWithOptions;
    };
    /** NoteId */
    result: string;
  };
  addNotes: {
    params: {
      notes: INoteWithOptions[];
    };
    /** NoteId[], will be `null` if failed */
    result: (string | null)[];
  };
  canAddNotes: {
    params: {
      notes: INoteWithOptions[];
    };
    /** boolean[] */
    result: boolean[];
  };
  updateNoteFields: {
    params: {
      note: Partial<INote> & {
        id: number;
        fields: INote['fields'];
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
    result: (Omit<INote, 'deckName' | 'fields'> & {
      noteId: number;
      fields: Record<
        string,
        {
          value: string;
          order: number;
        }
      >;
      cards: number[];
    })[];
  };
}

export class AnkiConnect {
  constructor(public baseURL = 'http://localhost:8765', public version = 6) {}

  async send<A extends keyof AnkiConnectActions>(
    action: A,
    params: AnkiConnectActions[A]['params'],
    version = this.version,
  ): Promise<AnkiConnectActions[A]['result']> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener('error', () => reject('failed to issue request'));
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (Object.getOwnPropertyNames(response).length != 2) {
            throw 'response has an unexpected number of fields';
          }
          if (!response.hasOwnProperty('error')) {
            throw 'response is missing required error field';
          }
          if (!response.hasOwnProperty('result')) {
            throw 'response is missing required result field';
          }
          if (response.error) {
            throw response.error;
          }
          resolve(response.result);
        } catch (e) {
          reject(e);
        }
      });

      xhr.open('POST', this.baseURL);
      xhr.send(JSON.stringify({ action, version, params }));
    });
  }

  chain<A extends keyof AnkiConnectActions>(
    action: A,
    params: AnkiConnectActions[A]['params'],
    version = this.version,
  ) {
    const actions: {
      action: keyof AnkiConnectActions;
      params: any;
    }[] = [{ action, params }];

    const chainable = {
      commit: async () => {
        if (actions.length > 1) {
          return this.send('multi', { actions }, version);
        }

        return this.send(action, params, version);
      },
      add: async <A extends keyof AnkiConnectActions>(
        action: A,
        params: AnkiConnectActions[A]['params'],
      ) => {
        actions.push({ action, params });
        return chainable;
      },
    };

    return chainable;
  }
}

export const ankiConnect = new AnkiConnect();
