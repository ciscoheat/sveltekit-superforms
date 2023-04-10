<script lang="ts">
  import type { Validation } from '$lib';
  import type { Schema } from './schemas';
  import { superForm } from '$lib/client';
  import { fieldProxy } from '$lib/client/proxies';
  import TextInput from './TextInput.svelte';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data: Validation<Schema>;

  const { form, errors, enhance } = superForm(data);
  const name = fieldProxy(form, ['name']);
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
  <TextInput name="name" field={name} />
  <button>Submit</button>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
  }
</style>
