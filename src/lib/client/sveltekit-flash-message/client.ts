import { type Writable, type Readable, writable, get } from 'svelte/store';
import type { Page } from '@sveltejs/kit';
import { onDestroy, tick } from 'svelte';
import { BROWSER as browser } from 'esm-env';

type FlashContext = {
  store: Writable<App.PageData['flash']>;
  clearArray: boolean;
};

const flashStores = new WeakMap<Readable<Page>, FlashContext>();

const notInitialized =
  'Flash store must be initialized with initFlash(page) before calling getFlash.';

export function initFlash(
  page: Readable<Page>,
  options: {
    clearArray?: boolean;
  } = {
    clearArray: false
  }
): Writable<App.PageData['flash']> {
  if (flashStores.has(page)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return flashStores.get(page)!.store;
  }

  if (!options.clearArray) options.clearArray = false;

  const { clearArray } = options;

  const store = writable<App.PageData['flash']>();
  const context = { store, clearArray };

  flashStores.set(page, context);
  updateStore(context, get(page).data.flash);

  onDestroy(() => flashStores.delete(page));
  return store;
}

export function getFlash(
  page: Readable<Page>
): Writable<App.PageData['flash']> {
  const context = flashStores.get(page);
  if (!context) throw new Error(notInitialized);
  return context.store;
}

export async function updateFlash(
  page: Readable<Page>,
  update?: () => Promise<void>
) {
  const store = flashStores.get(page);
  if (!store) throw new Error(notInitialized);

  // Update before setting the new message, so navigation events can pass through first.
  if (update) await update();
  await tick();
  updateStore(
    store,
    parseFlashCookie() as App.PageData['flash'] | undefined
  );
}

///////////////////////////////////////////////////////////

const parseCookieString = (str: string) => {
  const output = {} as Record<string, string>;
  if (!str) return output;

  return str
    .split(';')
    .map((v) => v.split('='))
    .reduce((acc, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, output);
};

/////////////////////////////////////////////////////////////////////

const path = '/';
const varName = 'flash';

function parseFlashCookie(cookieString?: string): unknown {
  if (!cookieString && browser) cookieString = document.cookie;

  if (!cookieString || !cookieString.includes(varName + '='))
    return undefined;

  const cookies = parseCookieString(cookieString);
  if (cookies[varName]) {
    try {
      return JSON.parse(cookies[varName]);
    } catch (e) {
      // Ignore value if parsing failed
    }
  }
  return undefined;
}

function updateStore(
  context: FlashContext,
  newData: App.PageData['flash'] | undefined
) {
  clearCookie();

  context.store.update((flash) => {
    if (newData === undefined) return flash;
    //console.log('Updating flash store:', newData);

    // Need to do a per-element comparison here, since update will be called
    // when going to the same route, while keeping the old flash message,
    // making it display multiple times.
    if (!context.clearArray && Array.isArray(newData)) {
      if (Array.isArray(flash)) {
        if (
          flash.length > 0 &&
          newData.length > 0 &&
          flash[flash.length - 1] === newData[newData.length - 1]
        ) {
          return flash;
        } else {
          return flash.concat(newData) as unknown as App.PageData['flash'];
        }
      }
    }

    return newData;
  });
}

function clearCookie() {
  //console.log('Clearing flash cookie', browser);
  if (browser) document.cookie = varName + `=; Max-Age=0; Path=${path};`;
}
