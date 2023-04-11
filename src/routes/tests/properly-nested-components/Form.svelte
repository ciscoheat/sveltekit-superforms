<script lang="ts">
  import type { Validation } from '$lib';
  import type { Schema } from './schemas';
  import { superForm } from '$lib/client';
  import { fieldProxy } from '$lib/client/proxies';
  import TextInput from './TextInput.svelte';
  import TextFormField from './TextFormField.svelte';
  import TextField from './TextField.svelte';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data: Validation<Schema>;

  const superFrm = superForm(data);
  const { form, errors, enhance } = superFrm;

  const name = fieldProxy(form, ['name']);
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
  <TextInput name="name" field={name} />
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <TextFormField name="address" form={superFrm} path="address" />

  <TextField name="city" {form} path="city" />
  {#if $errors.city}<span class="invalid">{$errors.city}</span>{/if}

  <button>Submit</button>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
  }
</style>
