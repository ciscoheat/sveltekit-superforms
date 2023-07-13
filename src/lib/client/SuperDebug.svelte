<script>
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';

  /**
   * @typedef {unknown | Promise<unknown>} EncodeableData
   * @typedef {import('svelte/store').Readable<EncodeableData>} EncodeableDataStore
   *
   * @typedef {EncodeableData | EncodeableDataStore} DebugData
   */

  /**
   * Data to be displayed as pretty JSON.
   *
   * @type {DebugData}
   */
  export let data;
  /**
   * Controls when the component should be displayed.
   *
   * Default: `true`.
   */
  export let display = true;
  /**
   * Controls when to show the http status code of the current page (reflecs the status code of the last request).
   *
   * Default is `true`.
   */
  export let status = true;
  /**
   * Optional label to identify the component easily.
   */
  export let label = '';
  /**
   * Controls the maximum length of a string field of the data prop.
   *
   * Default is `120` characters.
   */
  export let stringTruncate = 120;
  /**
   * Reference to the pre element that contains the shown d
   *
   * @type {HTMLPreElement | undefined}
   */
  export let ref = undefined;
  /**
   * Controls if the data prop should be treated as a promise (skips promise detection when true).
   *
   * Default is `false`.
   */
  export let promise = false;
  /**
   * Controls if the data prop should be treated as a plain object (skips promise and store detection when true, prevails over promise prop).
   *
   * Default is `false`.
   */
  export let raw = false;
  /**
   * Enables the display of fields of the data prop that are functions.
   *
   * Default is `false`.
   */
  export let functions = false;

  /**
   * @param {unknown} json
   * @returns {string}
   */
  function syntaxHighlight(json) {
    switch (typeof json) {
      case "function": {
        return `<span class="function">[function ${json.name ?? 'unnamed'}]</span>`;
      }
      case "symbol": {
        return `<span class="symbol">${json.toString()}</span>`;
      }
    }

    const encodedString = JSON.stringify(
      json,
      function (key, value) {
        if (value === undefined) {
          return '#}#undefined';
        }
        if (typeof this === 'object' && this[key] instanceof Date) {
          return '#}D#' + (isNaN(this[key]) ? 'Invalid Date' : value);
        }
        if (typeof value === 'number' && isNaN(value)) {
          return '#}#NaN';
        }
        if (typeof value === 'bigint') {
          return '#}BI#' + value;
        }
        if (typeof value === 'function' && functions) {
          return '#}F#' + `[function ${value.name}]`;
        }
        return value;
      },
      2
    )
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return encodedString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
            match = match.slice(1, -2) + ':';
          } else {
            cls = 'string';
            match =
              match.length > stringTruncate
                ? match.slice(0, stringTruncate / 2) +
                  `[..${match.length}..]` +
                  match.slice(-stringTruncate / 2)
                : match;

            if (match == '"#}#NaN"') {
              cls = 'nan';
              match = 'NaN';
            } else if (match == '"#}#undefined"') {
              cls = 'undefined';
              match = 'undefined';
            } else if (match.startsWith('"#}D#')) {
              cls = 'date';
              match = match.slice(5, -1);
            } else if (match.startsWith('"#}BI#')) {
              cls = 'bigint';
              match = match.slice(6, -1) + 'n';
            } else if (match.startsWith('"#}F#')) {
              cls = 'function';
              match = match.slice(5, -1);
            }
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  }

  /**
   * @param {EncodeableData} json
   * @returns {Promise<string>}
   */
  async function promiseSyntaxHighlight(json) {
    json = await json;
    return syntaxHighlight(json);
  }

  /**
   * @param {EncodeableData} data
   * @param {boolean} raw
   * @param {boolean} promise
   * @returns {data is Promise<unknown>}
   */
  function assertPromise(data, raw, promise) {
    if (raw) {
      return false;
    }
    return (
      promise ||
      (typeof data === 'object' &&
        data !== null &&
        'then' in data &&
        typeof data['then'] === 'function')
    );
  }

  /**
   * @param {DebugData} data
   * @param {boolean} raw
   * @returns {data is EncodeableDataStore}
   */
  function assertStore(data, raw) {
    if (raw) {
      return false;
    }
    return (
      typeof data === 'object' &&
      data !== null &&
      'subscribe' in data &&
      typeof data['subscribe'] === 'function'
    );
  }

  /** @type {EncodeableData} */
  let debugData;

  let dataIsStore = false;
  if (assertStore(data, raw)) {
    dataIsStore = true;
    const unsubscribe = data.subscribe((value) => {
      debugData = value;
    });
    onDestroy(unsubscribe);
  }

  $: if (!dataIsStore) {
    debugData = data;
  }
</script>

{#if display}
  <div class="super-debug">
    <div
      class="super-debug--status {label === ''
        ? 'absolute inset-x-0 top-0'
        : ''}"
    >
      <div class="super-debug--label">{label}</div>
      {#if status}
        <div
          class:info={$page.status < 200}
          class:success={$page.status >= 200 && $page.status < 300}
          class:redirect={$page.status >= 300 && $page.status < 400}
          class:error={$page.status >= 400}
        >
          {$page.status}
        </div>
      {/if}
    </div>
    <pre
      class="super-debug--pre {label === '' ? 'pt-4' : 'pt-0'}"
      bind:this={ref}><code class="super-debug--code"
        ><slot
          >{#if assertPromise(debugData, raw, promise)}{#await promiseSyntaxHighlight(debugData)}<div>Loading data...</div>{:then result}{@html result}{/await}{:else}{@html syntaxHighlight(
              debugData
            )}{/if}</slot
        ></code
      ></pre>
  </div>
{/if}

<!--
  @component

  SuperDebug is a debugging component that gives you colorized and nicely formatted output for any data structure, usually $form.
  
  Other use cases includes debugging plain objects, promises, stores and more.

  More info:
  - [API](https://superforms.rocks/api#superdebug)
  - [Examples](https://github.com/ciscoheat/sveltekit-superforms/tree/main/src/routes/super-debug)
  
  **Short example:**

  ```svelte
  <script>
    import SuperDebug from 'sveltekit-superforms/client/SuperDebug.svelte';

    export let data;
    
    const { errors, form, enhance } = superForm(data.form);
  </script>
  
  <form method="POST" use:enhance>
    <label>
      Name<br />
      <input
        name="name"
        type="text"
        aria-invalid={$errors.name ? 'true' : undefined}
        bind:value={$form.name}
      />
      {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
    </label>
    <label>
      Email<br />
      <input
        name="email"
        type="email"
        aria-invalid={$errors.email ? 'true' : undefined}
        bind:value={$form.email}
      />
      {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
    </label>
    <button>Submit</button>
  </form>
  <SuperDebug data={$form} label="My form data" />
  ```
-->

<style>
  .absolute {
    position: absolute;
  }

  .top-0 {
    top: 0;
  }

  .inset-x-0 {
    left: 0px;
    right: 0px;
  }

  .pt-0 {
    padding-top: 0px;
  }

  .pt-4 {
    padding-top: 1em;
  }

  .super-debug {
    --_sd-bg-color: var(--sd-bg-color, rgb(30, 41, 59));
    position: relative;
    background-color: var(--_sd-bg-color);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .super-debug--status {
    display: flex;
    padding: 1em;
    justify-content: space-between;
    font-family: Inconsolata, Monaco, Consolas, 'Lucida Console',
      'Courier New', Courier, monospace;
  }

  .super-debug--label {
    color: var(--sd-label-color, white);
  }

  .super-debug pre {
    color: var(--sd-code-default, #999);
    background-color: var(--_sd-bg-color);
    margin-bottom: 0px;
    /** Sakura is doing 0.9em, turn font-size back to 1em **/
    font-size: 1em;
  }

  .info {
    color: var(--sd-info, rgb(85, 85, 255));
  }

  .success {
    color: var(--sd-success, #2cd212);
  }

  .redirect {
    color: var(--sd-redirect, #03cae5);
  }

  .error {
    color: var(--sd-error, #ff475d);
  }

  :global(.super-debug--code .key) {
    color: var(--sd-code-key, #eab308);
  }

  :global(.super-debug--code .string) {
    color: var(--sd-code-string, #6ec687);
  }

  :global(.super-debug--code .date) {
    color: var(--sd-code-date, #f06962);
  }

  :global(.super-debug--code .boolean) {
    color: var(--sd-code-boolean, #79b8ff);
  }

  :global(.super-debug--code .number) {
    color: var(--sd-code-number, #af77e9);
  }

  :global(.super-debug--code .bigint) {
    color: var(--sd-code-bigint, #af77e9);
  }

  :global(.super-debug--code .null) {
    color: var(--sd-code-null, #238afe);
  }

  :global(.super-debug--code .nan) {
    color: var(--sd-code-nan, #af77e9);
  }

  :global(.super-debug--code .undefined) {
    color: var(--sd-code-undefined, #238afe);
  }

  :global(.super-debug--code .function) {
    color: var(--sd-code-function, #f06962);
  }

  :global(.super-debug--code .symbol) {
    color: var(--sd-code-symbol, #77e9c3);
  }

  .super-debug pre::-webkit-scrollbar {
    width: var(--sd-sb-width, 1.25rem);
    height: var(--sd-sb-height, 1.25rem);
    opacity: 0.5;
  }

  .super-debug pre::-webkit-scrollbar-track {
    background-color: var(--sd-sb-track-color, hsl(0, 0%, 40%, 0.2));
  }
  .super-debug:is(:focus-within, :hover) pre::-webkit-scrollbar-track {
    background-color: var(--sd-sb-track-color-focus, hsl(0, 0%, 50%, 0.2));
  }

  .super-debug pre::-webkit-scrollbar-thumb {
    background-color: var(--sd-sb-thumb-color, hsl(217, 50%, 50%, 0.5));
  }
  .super-debug:is(:focus-within, :hover) pre::-webkit-scrollbar-thumb {
    background-color: var(--sd-sb-thumb-color-focus, hsl(217, 50%, 50%));
  }
</style>
