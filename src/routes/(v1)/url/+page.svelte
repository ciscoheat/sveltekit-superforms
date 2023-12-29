<script lang="ts">
  import type { PageData, Snapshot } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { onMount } from 'svelte';

  export let data: PageData;

  const { form, errors, enhance } = superForm(data.form, {
    taintedMessage: null
  });

  onMount(() => {
    form.subscribe((form) => {
      if (form.id) goto(`?id=${form.id}`);
    });
  });
</script>

<SuperDebug data={$form} />

<h1>URL auto-update</h1>

<form method="POST" use:enhance>
  <label>
    Id<br />
    <input
      name="id"
      type="number"
      data-invalid={$errors.id}
      bind:value={$form.id}
    />
    {#if $errors.id}<span class="invalid">{$errors.id}</span>{:else}<span
        >OK</span
      >{/if}
  </label>

  <button>Submit</button>
</form>

<style>
  .invalid {
    color: red;
  }
</style>
