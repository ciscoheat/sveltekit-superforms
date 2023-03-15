<script lang="ts">
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import { schema } from './schema';

  export let data: PageData;

  const { form, errors, enhance, message } = superForm(data.form, {
    dataType: 'json',
    validation: schema
  });
</script>

<h2>Nested forms</h2>

<SuperDebug data={{ $form, $errors }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
  {#each $form.ids.id as id, i}
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
</form>

<style lang="scss">
  input {
    width: 100px;
  }

  .invalid {
    color: red;
  }
</style>
