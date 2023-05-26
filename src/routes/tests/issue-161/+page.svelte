<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { page } from '$app/stores';
  import { schema } from './schema';

  export let data: PageData;

  const { form, errors, tainted, message, enhance } = superForm(data.form, {
    dataType: 'json',
    validators: schema
  });

  function addPerson() {
    form.update(
      ($form) => {
        $form.persons = [...$form.persons, { name: '' }];
        return $form;
      },
      { taint: false }
    );
  }
</script>

<h3>#161</h3>

{#if $message}
  <div
    class="status"
    class:error={$page.status >= 400}
    class:success={$page.status == 200}
  >
    {$message}
  </div>
{/if}

<form method="POST" use:enhance>
  {#if $errors._errors}
    <div class="status error">{$errors._errors}</div>
  {/if}

  {#each $form.persons as p, i}
    <label>
      Name:
      <input
        name="name"
        data-invalid={$errors.persons?.[i]?.name}
        bind:value={p.name}
      />
      {#if $errors.persons?.[i]?.name}<span class="invalid"
          >{$errors.persons?.[i]?.name}</span
        >{/if}
    </label>
  {/each}

  <button on:click|preventDefault={addPerson}>Add person</button>
  <button>Submit</button>
</form>

<hr />
<p>
  <a target="_blank" href="https://superforms.vercel.app/api"
    >API Reference</a
  >
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
