<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const { form, errors, enhance, message, delayed } = superForm(data.form, {
    dataType: 'formdata',
    async onUpdated({ validation }) {
      if (validation.success) {
        await goto('/tutorial?id=' + validation.data.id);
      }
    }
  });
</script>

<SuperDebug data={$form} />

{#if $message}<h3 class:error={$page.status >= 400} class="message">{$message}</h3>{/if}

<h1>sveltekit-superforms</h1>

<div class="users">
  <b>Select customer:</b>
  {#each data.users as user}
    | <a href="?id={user.id}">{user.name}</a> |
  {/each}
  {#if !data.form.empty}
    <button on:click={() => goto('?')}>Create new</button>
  {/if}
</div>

<h2>{data.form.empty ? 'Create' : 'Update'} user</h2>

<form method="POST" use:enhance>
  <input type="hidden" name="id" value={$form.id} />

  <label>
    Name<br /><input name="name" data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br /><input name="email" data-invalid={$errors.email} bind:value={$form.email} />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
  {#if $delayed}Working...{/if}
</form>

<style lang="scss">
  .invalid {
    color: red;
  }

  .message {
    color: white;
    padding: 10px;
    background-color: rgb(46, 168, 68);

    &.error {
      background-color: rgb(168, 60, 46);
    }
  }
</style>
