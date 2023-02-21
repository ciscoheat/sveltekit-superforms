<script lang="ts">
  import { page } from '$app/stores';
  import { date } from 'zod';

  export let display = true;
  export let status = true;
  export let data: any;
  //export let wrapText = true;
  export let maxLength = 120;
  //export let expanded = false;
  export let ref: HTMLPreElement | undefined = undefined;

  function syntaxHighlight(json: any) {
    json = JSON.stringify(
      json,
      function (key, value) {
        if (value === undefined) {
          return '#}#undefined';
        }
        if (typeof this === 'object' && this[key] instanceof Date) {
          return '#}D#' + value;
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
              match.length > maxLength
                ? match.slice(0, maxLength / 2) +
                  `[..${match.length}..]` +
                  match.slice(-maxLength / 2)
                : match;

            if (match == '"#}#NaN"') {
              cls = 'num';
              match = 'NaN';
            } else if (match == '"#}#undefined"') {
              cls = 'undefined';
              match = 'undefined';
            } else if (match.startsWith('"#}D#')) {
              cls = 'date';
              match = match.slice(5, -1);
            } else if (match.startsWith('"#}BI#')) {
              cls = 'num';
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
  <div class="wrapper">
    {#if status}
      <div
        class:green={$page.status < 300}
        class:yellow={$page.status >= 300}
        class:red={$page.status >= 400}
        class="page-status"
      >
        <div>{$page.status}</div>
      </div>
    {/if}
    <pre bind:this={ref}><code
        ><slot
          >{#if data}{@html syntaxHighlight(data)}{/if}</slot
        ></code
      ></pre>
  </div>
{/if}

<style lang="scss">
  $accent: #ffc800;
  $accent-dark: #b98c00;
  $secondary: #d20000;

  .wrapper {
    margin: 0.5rem 0;

    .page-status {
      display: flex;
      padding-right: 16px;
      justify-content: right;
      position: relative;
      height: 0;
      z-index: 1;
      text-shadow: 0px 1px 2px rgba(255, 255, 255, 0.25);

      & > div {
        padding-top: 10px;
      }
    }

    pre {
      color: #999;
      background-color: #222;
    }
  }

  .green {
    color: green;
  }

  .yellow {
    color: yellow;
  }

  .red {
    color: $secondary;
  }

  :global(.key) {
    color: $accent;
  }

  :global(.string) {
    color: #73c8a9;
  }

  :global(.date) {
    color: #d44478;
  }

  :global(.boolean) {
    color: #bd5532;
  }

  :global(.num) {
    color: darkorange;
  }

  :global(.null) {
    color: blueviolet;
  }

  :global(.undefined) {
    color: #704a9f;
  }
</style>
