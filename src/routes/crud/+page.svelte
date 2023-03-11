<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';

  export let data: PageData;

  const { form, errors, enhance, delayed, message } = superForm(data.form);
</script>

<h1>sveltekit-superforms</h1>

{#if $message}
  <h3 class:invalid={$page.status >= 400}>{$message}</h3>
{/if}

<h2>{data.form.empty ? 'Create' : 'Update'} user</h2>

<form method="POST" use:enhance>
  <input type="hidden" name="id" value={$form.id} />

  <label>
    Name<br />
    <input name="name" data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br />
    <input
      name="email"
      data-invalid={$errors.email}
      bind:value={$form.email}
    />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
  {#if $delayed}Working...{/if}
</form>

<style>
  .invalid {
    color: red;
  }
</style>
