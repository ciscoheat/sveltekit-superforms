<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data: PageData;

  // Missing a field, which will result in a console error.
  // @ts-ignore
  data.form.data = {};

  const { form, errors, tainted, message, enhance } = superForm(data.form, {
    //dataType: 'json',
    validators: {
      age: (age) =>
        isNaN(age) || age < 30 ? 'At least 30 years, please!' : null,
      name: (name) =>
        name.length < 2 ? 'At least two characters, please!' : null
    },
    taintedMessage: null
  });
</script>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
  <label>
    Age: <input name="age" type="number" bind:value={$form.age} />
    {#if $errors.age}<span class="invalid">{$errors.age}</span>{/if}
  </label>
  <label>
    Name: <input name="name" bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>
  <div>
    <button>Submit</button>
  </div>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;

    input {
      background-color: #dedede;
    }

    .invalid {
      color: crimson;
    }
  }
</style>
