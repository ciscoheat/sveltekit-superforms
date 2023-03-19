<script lang="ts">
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import { schema } from './schema';
  import * as flashModule from 'sveltekit-flash-message/client';

  export let data: PageData;

  const { form, errors, enhance, message } = superForm(data.form, {
    dataType: 'json',
    validators: schema,
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
  {#each $form.ids.id as _, i}
    <div>
      <input
        type="number"
        data-invalid={($errors.ids?.id && $errors.ids.id[i]) || undefined}
        bind:value={$form.ids.id[i]}
      />
      {#if $errors.ids?.id && $errors.ids.id[i]}<span class="invalid"
          >{$errors.ids.id[i]}</span
        >{/if}
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
