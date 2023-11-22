<script lang="ts">
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { superForm } from '$lib/client/index.js';
  import type { PageData } from './$types';

  export let data: PageData;

  let postedData: any;

  const { form, enhance, posted, allErrors } = superForm(data.form, {
    onUpdated(event) {
      postedData = event.form.data;
    }
  });

  let dynamicInputCount = 2;
</script>

<a href="/">&lt; Back to start</a>

<SuperDebug label="Form data" data={$form} />
{#if $posted}
  {#if $allErrors.length > 0}
    <SuperDebug label="Errors" data={$allErrors} />
  {/if}
{/if}

<form method="post" use:enhance>
  <label
    >known 1 <input
      type="text"
      name="known_1"
      bind:value={$form.known_1}
    /></label
  >
  <label
    >known 2 <input
      type="text"
      name="known_2"
      bind:value={$form.known_2}
    /></label
  >

  <div>
    <button
      type="button"
      disabled={dynamicInputCount === 0}
      on:click={() => dynamicInputCount--}>less inputs</button
    >
    <button type="button" on:click={() => dynamicInputCount++}
      >more inputs</button
    >
  </div>

  {#each Array(dynamicInputCount) as _, idx}
    <label
      >dynamic number (<code>dynamic_{idx}</code>)
      <input type="text" name="dynamic_{idx}" /></label
    >
  {/each}

  <button>Submit</button>
</form>
