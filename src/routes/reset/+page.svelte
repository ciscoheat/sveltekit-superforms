<script lang="ts">
  import { superForm, type SuperForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { schema } from './schemas';
  import { page } from '$app/stores';

  export let data: PageData;

  let resets = 0;

  const superF: SuperForm<typeof schema> = superForm(data.form, {
    resetForm: $page.url.searchParams.has('function')
      ? async () => {
          console.log('Reset...');
          await new Promise((resolve) => setTimeout(resolve, 300));
          return true;
        }
      : true,
    onUpdated({ form }) {
      if (form.valid) resets = resets + 1;
    }
  });

  $: form = superF.form;
  $: enhance = superF.enhance;
  $: errors = superF.errors;
</script>

<SuperDebug data={$form} />

<div>Resets: {resets}</div>

<form method="POST" use:enhance>
  <input type="text" name="name" bind:value={$form.name} /><br />
  {#if $errors.name}<span>{$errors.name}</span><br />{/if}
  <button>Submit</button>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
  }
</style>
