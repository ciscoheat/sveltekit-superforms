<script lang="ts">
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const { form, errors, enhance, delayed, message } = superForm(data.form, {
    dataType: $page.url.searchParams.has('json') ? 'json' : 'form'
  });
</script>

<SuperDebug data={$form} />

<h1>sveltekit-superforms upload</h1>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" enctype="multipart/form-data" use:enhance>
  <label>
    Filename<br /><input
      name="filename"
      data-invalid={$errors.filename}
      bind:value={$form.filename}
    />
    {#if $errors.filename}<span class="invalid">{$errors.filename}</span
      >{/if}
  </label>

  <input type="file" name="file" />

  <div>
    <button>Submit</button>
    {#if $delayed}Working...{/if}
  </div>
</form>

<style lang="scss">
  .invalid {
    color: red;
  }
</style>
