<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import * as flashModule from 'sveltekit-flash-message/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schema';
  import { page } from '$app/stores';

  export let data: PageData;

  const { form, errors, tainted, message, enhance } = superForm(data.form, {
    taintedMessage: null,
    validators: schema,
    flashMessage: {
      module: flashModule,
      onError: ({ result, message }) => {
        message.set({ type: 'error', message: result.error.message });
      }
    }
  });

  $: action = $page.url.searchParams.has('throw-hooks-error')
    ? '?throw-hooks-error'
    : '';
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" {action} use:enhance>
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
