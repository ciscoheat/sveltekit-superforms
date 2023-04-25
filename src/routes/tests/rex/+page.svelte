<script lang="ts">
  import type { PageData } from './$types';
  import { superForm } from '$lib/client';
  import { basicSchema, refined } from './schema';
  import { page } from '$app/stores';

  export let data: PageData;

  // Client API:
  const { form, errors, constraints, message, enhance } = superForm(
    data.form,
    {
      dataType: 'json',
      validators: basicSchema,
      validationMethod: ($page.url.searchParams.get('method') ??
        undefined) as any
    }
  );
</script>

<h4>Validation method: {$page.url.searchParams.get('method') ?? 'auto'}</h4>

<form method="POST" use:enhance>
  {#if $message}
    <div>Message: {$message}</div>
    <br />
  {/if}
  <label for="name">Name</label>
  <input
    type="text"
    name="name"
    data-invalid={$errors.name}
    bind:value={$form.name}
  />
  <!-- {...$constraints.name} -->
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <label for="email">E-mail</label>
  <input
    type="text"
    name="email"
    data-invalid={$errors.email}
    bind:value={$form.email}
  />
  <!-- {...$constraints.email} -->
  {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}

  <div>
    {#each $form.tags as _, i}
      <div>
        <label for="min">Min</label>
        <input
          data-invalid={$errors.tags?.[i]?.min}
          bind:value={$form.tags[i].min}
          type="number"
        />
        {#if $errors.tags?.[i]?.min}
          <br />
          <span class="invalid">{$errors.tags[i].min}</span>
        {/if}
      </div>
      <div>
        <label for="max">Max</label>
        <input
          data-invalid={$errors.tags?.[i]?.max}
          bind:value={$form.tags[i].max}
          type="number"
        />
        {#if $errors.tags?.[i]?.max}
          <br />
          <span class="invalid">{$errors.tags[i].max}</span>
        {/if}
      </div>
    {/each}
  </div>

  <button
    on:click={() => ($form.tags = [...$form.tags, { min: 10, max: 5 }])}
    type="button">Add tag</button
  >

  <div><button>Submit</button></div>
</form>

<style>
  .invalid {
    color: red;
  }

  button {
    margin-top: 2rem;
  }
</style>
