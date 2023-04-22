<script lang="ts">
  import { onMount, tick, afterUpdate } from 'svelte';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';

  export let data: PageData;

  const { form, errors, enhance, message, tainted } = superForm(data.form);

  let menu = ['Cookies and cream', 'Mint choc chip', 'Raspberry ripple'];

  function join(flavours: string[]) {
    if (flavours.length === 1) return flavours[0];
    return `${flavours.slice(0, -1).join(', ')} and ${
      flavours[flavours.length - 1]
    }`;
  }
</script>

<SuperDebug data={{ $form, $tainted }} />

<form method="POST">
  <h2>Size</h2>

  <label>
    <input type="radio" bind:group={$form.scoops} name="scoops" value={1} />
    One scoop
  </label>

  <label>
    <input type="radio" bind:group={$form.scoops} name="scoops" value={2} />
    Two scoops
  </label>

  <label>
    <input type="radio" bind:group={$form.scoops} name="scoops" value={3} />
    Three scoops
  </label>

  {#if $errors.scoops}<p>{$errors.scoops}</p>{/if}

  <h2>Flavours</h2>

  {#each menu as flavour}
    <label>
      <input
        type="checkbox"
        bind:group={$form.flavours}
        name="flavours"
        value={flavour}
      />
      {flavour}
    </label>
  {/each}

  {#if $errors.flavours}<p>{$errors.flavours}</p>{/if}

  {#if $message}<p>{$message}</p>{/if}
  <button>Submit</button>
</form>

<p class="info">
  <a href="https://svelte.dev/tutorial/group-inputs"
    >Original code from Svelte documentation</a
  >
</p>

<style>
  .info {
    border-top: 1px solid gray;
    margin-top: 4rem;
  }
</style>
