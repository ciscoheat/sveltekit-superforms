<script lang="ts">
  import type { PageData } from './$types';
  import { superForm } from '$lib/client';
  import { schema } from './schema';
  import { page } from '$app/stores';

  export let data: PageData;

  // Client API:
  const { form, errors, constraints, message, enhance } = superForm(
    data.form,
    {
      validators: schema,
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

  <div><button>Submit</button></div>
</form>

<style>
  .invalid {
    color: red;
  }
</style>
