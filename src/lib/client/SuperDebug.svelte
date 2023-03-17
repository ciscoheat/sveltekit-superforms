<script lang="ts">
  import { page } from '$app/stores';

  export let display = true;
  export let status = true;
  export let data: any;
  export let stringTruncate = 120;
  export let ref: HTMLPreElement | undefined = undefined;
  export let label = "";
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
        let cls = 'num';
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
    json = await json
    return syntaxHighlight(json)
  }
</script>

{#if display}
  <div class="super-debug">
    {#if status}
      <div class="super-debug--status {label === "" ? 'absolute inset-x-0 top-0' : ''}">
        <div class="super-debug--label">{label}</div>
        <div
          class:info={$page.status < 200}
          class:success={$page.status >= 200 && $page.status < 300}
          class:redirect={$page.status >= 300 && $page.status < 400}
          class:error={$page.status >= 400}
        >
          {$page.status}
        </div>
      </div>
    {/if}
    <pre class="super-debug--pre {label === "" ? 'pt-4' : 'pt-0'}" bind:this={ref}><code
        class="super-debug--code"
        ><slot
          >{#if promise}{#await promiseSyntaxHighlight(data) }<div>Loading data</div>{:then result}{@html result}{/await}{:else}{@html syntaxHighlight(data)}{/if}</slot
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
    position: relative;
    background-color: #222;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .super-debug .super-debug--status {
    display: flex;
    padding: 1em;
    justify-content: space-between;
  }

  .super-debug--label {
    color: white;
  }

  .super-debug pre {
    color: #999;
    background-color: #222;
    margin-bottom: 0px;
    /** Sakura is doing 0.9em, turn font-size back to 1em **/
    font-size: 1em;
  }

  .info {
    color: rgb(85, 85, 255);
  }

  .success {
    color: rgb(13, 160, 13);
  }

  .redirect {
    color: yellow;
  }

  .error {
    color: #f21c1c;
  }

  :global(.super-debug--code .key) {
    color: #ffc800;
  }

  :global(.super-debug--code .string) {
    color: #73c8a9;
  }

  :global(.super-debug--code .date) {
    color: #c25bc5;
  }

  :global(.super-debug--code .boolean) {
    color: #c55833;
  }

  :global(.super-debug--code .num) {
    color: darkorange;
  }

  :global(.super-debug--code .bigint) {
    color: darkorange;
  }

  :global(.super-debug--code .null) {
    color: blueviolet;
  }

  :global(.super-debug--code .nan) {
    color: #704a9f;
  }

  :global(.super-debug--code .undefined) {
    color: #704a9f;
  }
</style>
