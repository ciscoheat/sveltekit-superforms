<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import AutoComplete from './AutoComplete.svelte';
  import { schema } from './schema';

  export let data: PageData;

  let novalidate = false;

  const pageForm = superForm(data.form, {
    dataType: 'json',
    validators: schema
  });
  const { form, errors, message, enhance, tainted } = pageForm;

  const options = [
    { value: 'A', label: 'Aldebaran' },
    { value: 'B', label: 'Betelgeuse' }
  ];
</script>

{#if $tainted?.sub?.tags?.[0]}<h3>FORM IS TAINTED</h3>{/if}

{#if $message}<h4>{$message}</h4>{/if}

<form {novalidate} method="POST" use:enhance>
  <AutoComplete form={pageForm} field="sub.tags" {options} taint={false} />
  <div style="margin-top:1rem;">
    <button>Submit</button>
    <button formnovalidate>Submit formnovalidate</button>
    <input
      type="checkbox"
      bind:checked={novalidate}
      on:click={() => (novalidate = !novalidate)}
    /> novalidate on form
  </div>
</form>

<SuperDebug data={{ $form, $errors, $tainted }} />

<style lang="scss">
  form {
    margin: 2rem 0;
  }
</style>
