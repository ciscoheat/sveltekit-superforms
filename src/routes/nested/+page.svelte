<script lang="ts">
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  //import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import { schema } from './schema';
  import * as flashModule from 'sveltekit-flash-message/client';

  export let data: PageData;

  const { form, errors, enhance, message } = superForm(data.form, {
    dataType: 'json',
    onUpdate(event) {
      if ($page.url.searchParams.has('cancel')) event.cancel();
    },
    validators: schema,
    /*
    validators: {
      tags: {
        id: (id) => (id < 3 ? 'Id must be larger than 2' : null),
        name: (name) =>
          name.length < 2 ? 'Tags must be at least two characters' : null
      }
    },
    */
    flashMessage: {
      module: flashModule,
      onError({ result, message }) {
        message.set({
          type: 'error',
          message: result.error.message
        });
      }
    }
  });

  // <SuperDebug data={{ $form, $errors }} />
</script>

<h2>Nested forms</h2>

<a href="/">&lt; Back to start</a>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
  {#each $form.tags as _, i}
    <div>
      <input
        type="number"
        data-invalid={$errors.tags?.[i]?.id}
        bind:value={$form.tags[i].id}
      />
      <input
        data-invalid={$errors.tags?.[i]?.name}
        bind:value={$form.tags[i].name}
      />
      {#if $errors.tags?.[i]?.id}
        <br />
        <span class="invalid">{$errors.tags[i].id}</span>
      {/if}
      {#if $errors.tags?.[i]?.name}
        <br />
        <span class="invalid">{$errors.tags[i].name}</span>
      {/if}
    </div>
  {/each}
  <button>Submit</button>
  <span
    ><input type="checkbox" name="redirect" bind:checked={$form.redirect} /> Redirect
    on success</span
  >
</form>

<style lang="scss">
  button {
    margin-right: 20px;
  }

  input:not([type='checkbox']) {
    width: 100px;
  }

  .invalid {
    color: red;
  }
</style>
