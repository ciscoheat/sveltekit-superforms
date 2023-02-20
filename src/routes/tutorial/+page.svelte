<script lang="ts">
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;

  const { form, errors, enhance } = superForm(data.form);
</script>

<SuperDebug data={$form} />

<h1>sveltekit-superforms</h1>

<form method="POST" use:enhance>
  <label for="name">Name</label>
  <input type="text" name="name" bind:value={$form.name} />
  {#if $errors.name}
    <span data-invalid>{$errors.name}</span>
  {/if}

  <label for="email">E-mail</label>
  <input type="text" name="email" bind:value={$form.email} />
  {#if $errors.email}
    <span data-invalid>{$errors.email}</span>
  {/if}

  <div><button>Submit</button></div>
</form>

<style lang="scss">
  [data-invalid] {
    color: red;
  }
</style>
