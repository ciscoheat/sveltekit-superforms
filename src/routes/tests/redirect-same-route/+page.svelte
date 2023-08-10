<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schema';

  export let data: PageData;

  const { form, errors, tainted, message, enhance, submitting } = superForm(
    data.form,
    {
      //dataType: 'json',
      //validators: schema
    }
  );
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
  <label>
    Name: <input name="name" bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>
  <div class="toolbar">
    <button>Submit</button>
    {#if $submitting}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        ><path
          fill="currentColor"
          d="M12 21a9 9 0 1 1 6.18-15.55a.75.75 0 0 1 0 1.06a.74.74 0 0 1-1.06 0A7.51 7.51 0 1 0 19.5 12a.75.75 0 0 1 1.5 0a9 9 0 0 1-9 9Z"
        /></svg
      >
    {/if}
  </div>
</form>

<style lang="scss">
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

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
