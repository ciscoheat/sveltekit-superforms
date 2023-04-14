<script lang="ts">
  import { initFlash } from 'sveltekit-flash-message/client';
  import { page } from '$app/stores';
  import { beforeNavigate } from '$app/navigation';

  const flash = initFlash(page);

  beforeNavigate((nav) => {
    if ($flash && nav.from?.url.toString() != nav.to?.url.toString()) {
      $flash = undefined;
    }
  });
</script>

<svelte:head><title>Superforms testing grounds</title></svelte:head>

{#if $flash}
  {@const bg = $flash.type == 'success' ? '#3D9970' : '#FF4136'}
  <div style:background-color={bg} class="flash">{$flash.message}</div>
{/if}

<nav>
  <a href="/">Start</a> |
  <a href="/test">Test page</a> |
  <a href="/crud">CRUD</a> |
  <a href="/super-debug">SuperDebug</a> |
  <a href="/nested">Nested</a> |
  <a href="/multiple">Multiple</a> |
  <a href="/multiple2">Multiple 2</a>
  <br />
  <a href="/snapshot">Snapshot</a> |
  <a href="/dates">Dates</a> |
  <a href="/reset">Reset</a> |
  <a href="/url">URL</a> |
  <a href="/tainted">Tainted</a> |
  <a href="/proxies">Proxies</a> |
  <a href="/properly-nested">Properly nested</a> |
  <a href="/files">Files</a>
</nav>

<slot />

<style lang="scss">
  .flash {
    padding: 5px 10px;
    color: white;
    border-radius: 3px;
  }

  nav {
    text-align: center;
    margin-bottom: 12px;
  }
</style>
