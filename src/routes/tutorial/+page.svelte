<script lang="ts">
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const { form, errors, enhance, delayed } = superForm(data.form, { dataType: 'formdata' });
</script>

<SuperDebug data={$form} />

<h1>sveltekit-superforms</h1>

<form method="POST" use:enhance>
  <label>
    Name<br /><input data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br /><input data-invalid={$errors.email} bind:value={$form.email} />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
  {#if $delayed}Working...{/if}
</form>

<style lang="scss">
  .invalid {
    color: red;
  }
</style>
