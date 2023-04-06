<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schemas';

  export let data: PageData;

  let resets = 0;

  const { form, enhance, reset } = superForm(data.form, {
    resetForm: true,
    onUpdated({ form }) {
      if (form.valid) resets = resets + 1;
    }
  });
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
