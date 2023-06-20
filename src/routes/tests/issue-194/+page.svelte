<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  //import { schema } from './schema';

  export let data: PageData;

  const { form, errors, tainted, message, enhance } = superForm(data.form, {
    dataType: 'json'
    //validators: schema
  });
</script>

<SuperDebug data={{ things: Array.from($form.things), $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
  <div>
    <button
      type="button"
      on:click={() =>
        form.update(
          ($form) => {
            $form.things.add(1);
            return $form;
          },
          { taint: { fields: 'things' } }
        )}>Add 1</button
    >
    <button
      type="button"
      on:click={() => {
        $form.things = new Set([2, 3, 4]);
      }}>Set 2,3,4</button
    >
    <button>Submit</button>
  </div>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;

    input {
      background-color: #dedede;
    }
  }
</style>
