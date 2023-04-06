<script lang="ts">
  import { superForm, type SuperForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { schema } from './schemas';

  export let data: PageData;

  let resets = 0;

  const superF: SuperForm<typeof schema> = superForm(data.form, {
    resetForm: true,
    onUpdated({ form }) {
      if (form.valid) resets = resets + 1;
    }
  });

  $: form = superF.form;
  $: enhance = superF.enhance;
</script>

<SuperDebug data={$form} />

<div>Resets: {resets}</div>

<form method="POST" use:enhance>
  <input type="text" name="name" bind:value={$form.name} /><br />
  <button>Submit</button>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
  }
</style>
