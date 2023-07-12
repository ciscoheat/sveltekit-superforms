<script lang="ts">
  import { page } from '$app/stores';

  export let display = true;
  export let status = true;
  export let data: any;
  export let stringTruncate = 120;
  export let ref: HTMLPreElement | undefined = undefined;
  export let label = '';
  export let promise = false;

  function syntaxHighlight(json: any) {
    json = JSON.stringify(
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
        return value;
      },
      2
    )
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match: string) {
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

  async function promiseSyntaxHighlight(json: any) {
    json = await json;
    return syntaxHighlight(json);
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
          >{#if promise}{#await promiseSyntaxHighlight(data)}<div>Loading data</div>{:then result}{@html result}{/await}{:else}{@html syntaxHighlight(
              data
            )}{/if}</slot
        ></code
      ></pre>
  </div>
{/if}

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
