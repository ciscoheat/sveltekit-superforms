<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schemas';
  import { page } from '$app/stores';
  import InputField from './input-field.svelte';

  export let data: PageData;

  const { form, errors, message, tainted, enhance } = superForm(data.form, {
    dataType: 'json',
    defaultValidator: 'keep',
    validators: schema,
    onError: (event) => {
      console.log('onError', event);
    },
    onResult: (event) => {
      console.log('onResult', event);
    },
    onSubmit: (args) => {
      console.log('onSubmit', args);
    }
  });

  $: {
    //console.log('current form', $form, 'errors', $errors);
  }
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<h3>Superforms testing ground</h3>

{#if $message}
  <div
    class="status"
    class:error={$page.status >= 400}
    class:success={$page.status == 200}
  >
    {$message}
  </div>
{/if}

{#if $errors}
  <div
    class="status"
    class:error={$page.status >= 400}
    class:success={$page.status == 200}
  >
    ERRORS
    {JSON.stringify($errors, null, 2)}
  </div>
{/if}
<form method="POST" enctype="multipart/form-data" use:enhance>
  <InputField label="Name" bind:value={$form.name} errors={$errors.name} />
  <br />
  <label>
    Email<br />
    <input
      name="email"
      type="email"
      data-invalid={$errors.email}
      bind:value={$form.email}
    />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>
  <br />

  <button>Submit</button>
</form>

<hr />
<p>
  <a target="_blank" href="https://superforms.rocks/api">API Reference</a>
</p>

<style>
  .invalid {
    color: red;
  }

  .status {
    color: white;
    padding: 4px;
    padding-left: 8px;
    border-radius: 2px;
    font-weight: 500;
  }

  .status.success {
    background-color: seagreen;
  }

  .status.error {
    background-color: #ff2a02;
  }

  input {
    background-color: #ddd;
  }

  a {
    text-decoration: underline;
  }

  hr {
    margin-top: 4rem;
  }

  form {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
</style>
