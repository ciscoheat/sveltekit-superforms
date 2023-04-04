<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';

  export let data: PageData;

  const {
    form,
    errors,
    enhance,
    delayed,
    message,
    reset,
    empty,
    constraints
  } = superForm(data.form, {
    onUpdated({ form }) {
      // Need to do this because messages can't be preserved on redirect.
      // sveltekit-flash-message fixes this issue:
      // https://github.com/ciscoheat/sveltekit-flash-message
      if (form.valid && data.form.empty) {
        reset({ keepMessage: true });
      }
    }
  });
</script>

<a href="/">&lt; Back to start</a>

<h1>sveltekit-superforms</h1>

<div class="users">
  {#each data.users as user}
    <a href="?id={user.id}">{user.name}</a>
  {/each}
  {#if !$empty}
    <form action="/crud">
      <button>Create new</button>
    </form>
  {/if}
</div>

{#if $message}
  <h3 class:invalid={$page.status >= 400}>{$message}</h3>
{/if}

<h2>{$empty ? 'Create' : 'Update'} user</h2>

<form method="POST" use:enhance>
  <input type="hidden" name="id" bind:value={$form.id} />

  <label>
    Name<br />
    <input name="name" data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br />
    <input
      name="email"
      type="email"
      data-invalid={$errors.email}
      bind:value={$form.email}
      {...$constraints.email}
    />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
  {#if $delayed}Working...{/if}

  {#if !$empty}
    <button
      name="delete"
      value="delete"
      on:click={(e) => !confirm('Are you sure?') && e.preventDefault()}
      class="danger">Delete user</button
    >
  {/if}
</form>

<style>
  .invalid {
    color: red;
  }

  .danger {
    background-color: brown;
  }

  .users {
    columns: 3 150px;
  }

  .users > * {
    display: block;
    white-space: nowrap;
    overflow-x: hidden;
  }

  .users a:hover {
    border-bottom: none;
  }
</style>
