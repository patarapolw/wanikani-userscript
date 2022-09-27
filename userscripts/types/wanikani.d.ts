import 'jquery';
import 'jstorage';

declare global {
  interface Window {
    unsafeWindow?: Window;
    console: Console;
  }
}
