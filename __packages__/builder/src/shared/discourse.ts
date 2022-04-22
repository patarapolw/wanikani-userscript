import { UserScriptWindow } from './userscript';

declare const unsafeWindow: Window & typeof globalThis;
declare const exportFunction: (...args: any[]) => any;

class DiscourseWindow extends UserScriptWindow {
  get window() {
    return typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
  }

  get exportFunction() {
    return typeof exportFunction === 'undefined'
      ? (o: any) => o
      : exportFunction;
  }

  require(m: 'pretty-text/engines/discourse-markdown-it'): {
    cook(raw: string, opts: any): string;
  };
  require(m: 'discourse/controllers/composer'): {
    default: {
      prototype: {
        save(t: unknown): void;
      };
    };
  };

  require(m: string): any {
    return (this.window as any).require(m);
  }
}

export const w = new DiscourseWindow();

let isCookedInjected = false;

export function injectCook(fn: (raw: string) => string) {
  if (isCookedInjected) return false;
  isCookedInjected = true;
  const rq = w.require('pretty-text/engines/discourse-markdown-it');
  const { cook } = rq;
  rq.cook = w.exportFunction(function (raw: string, opts: any) {
    return cook(fn(raw), opts);
  }, w);

  return true;
}

let isSaveInjected = false;

export function injectSave(fn: () => void) {
  if (isSaveInjected) return false;
  isSaveInjected = true;
  const rq = w.require('discourse/controllers/composer');
  const { save } = rq.default.prototype;
  rq.default.prototype.save = w.exportFunction(function (t: unknown) {
    fn();
    // @ts-ignore
    save.bind(this)(t);
  });

  return true;
}

export class DiscourseTextEdit {
  tText: HTMLTextAreaElement | null = null;

  async setup(evt: {
    onCreate?: (el: HTMLTextAreaElement) => void;
    onUpdate?: (ev: CompositionEvent) => void;
    onCleanup?: () => void;
    onChange?: (md: string) => string;
    onSave: (md: string) => string;
  }) {
    this.tText = document.querySelector('textarea.d-editor-input');

    let waitLimit = 30;
    let obsTarget: HTMLElement | null = null;
    while (
      (obsTarget = document.getElementById('reply-control')) &&
      waitLimit--
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!obsTarget) return null;

    const notifyOnChange = () => {
      if (!this.tText) return;
      const onChange = evt.onChange || evt.onSave;
      const v = onChange(this.tText.value);
      if (v === this.tText.value) return;
      this.tText.value = v;
      this.tText.dispatchEvent(
        new Event('change', { bubbles: true, cancelable: true }),
      );
    };

    this.tText = await new Promise<HTMLTextAreaElement>((resolve) => {
      const obs = new MutationObserver((muts) => {
        muts.forEach((m) => {
          for (const n of m.addedNodes) {
            if (n instanceof HTMLTextAreaElement) {
              if (evt.onUpdate) {
                n.addEventListener('compositionupdate', evt.onUpdate);
              }
              n.addEventListener('compositionend', notifyOnChange);

              resolve(n);
              obs.disconnect();
            }
          }
          for (const n of m.removedNodes) {
            if (
              evt.onCleanup &&
              n instanceof HTMLElement &&
              n.classList.contains('reply-area')
            ) {
              evt.onCleanup();
              this.setup(evt);
            }
          }
        });
      });

      obs.observe(obsTarget!, { childList: true, subtree: true });
    });

    injectCook(evt.onSave);
    injectSave(notifyOnChange);

    return this.tText;
  }
}
