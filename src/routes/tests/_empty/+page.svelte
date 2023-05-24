<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schemas';

  export let data: PageData;

  const { form, errors, tainted, message, enhance } = superForm(data.form, {
    //dataType: 'json',
    //validators: schema
  });
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
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
