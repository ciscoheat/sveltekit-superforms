<script lang="ts">
  import { page } from '$app/stores';

  export let display = true;
  export let status = true;
  export let data: any;
  export let stringTruncate = 120;
  export let ref: HTMLPreElement | undefined = undefined;
  //export let wrapText = true;
  //export let expanded = false;

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
</script>

{#if display}
  <div class="super-debug">
    {#if status}
      <div
        class:green={$page.status < 300}
        class:yellow={$page.status >= 300}
        class:red={$page.status >= 400}
        class="super-debug--status"
      >
        <div>{$page.status}</div>
      </div>
    {/if}
    <pre bind:this={ref}><code class="super-debug--code"
        ><slot
          >{#if data}{@html syntaxHighlight(data)}{/if}</slot
        ></code
      ></pre>
  </div>
{/if}

<style>
  .super-debug {
    margin: 0.5rem 0;
  }

  .super-debug .super-debug--status {
    display: flex;
    padding-right: 16px;
    justify-content: right;
    position: relative;
    height: 0;
    z-index: 1;
    text-shadow: 0px 1px 2px rgba(255, 255, 255, 0.25);
  }

  .super-debug .super-debug--status > div {
    padding-top: 10px;
  }

  .super-debug pre {
    color: #999;
    background-color: #222;
  }

  .green {
    color: green;
  }

  .yellow {
    color: yellow;
  }

  .red {
    color: #d20000;
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
