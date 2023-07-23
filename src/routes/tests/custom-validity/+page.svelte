<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schema';

  export let data: PageData;

  const { form, errors, tainted, message, enhance, constraints } = superForm(
    data.form,
    {
      customValidity: true,
      validators: schema
    }
  );
</script>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
  <label>
    Name: <input name="name" bind:value={$form.name} />
  </label>

  <label>
    Email: <input type="email" name="email" bind:value={$form.email} />
  </label>

  <label>
    Number: <input type="number" name="number" bind:value={$form.number} />
  </label>

  <label>
    Info: <input
      type="TEXt"
      name="info"
      data-no-custom-validity
      bind:value={$form.info}
    />
    {#if $errors.info}<span class="invalid">{$errors.info}</span>{/if}
  </label>

  <label>
    Accept terms: <input
      type="checkbox"
      name="accept"
      bind:checked={$form.accept}
    />
  </label>
  <div>
    <button>Submit</button>
  </div>
</form>

<!--SuperDebug data={{ $form, $errors }} /-->

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
