<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  console.log('LOAD', data.form.data.id);

  const { form, errors, enhance, delayed } = superForm(data.form, {
    dataType: 'formdata',
    async onUpdated({ validation }) {
      if (validation.success && data.form.empty) {
        console.log(validation.data);
        await goto('/tutorial?id=' + validation.data.id);
      }
    }
  });
</script>

<SuperDebug data={$page} />

<h1>sveltekit-superforms</h1>

<div class="users">
  <b>Select customer:</b>
  {#each data.users as user}
    | <a href="?id={user.id}">{user.name}</a> |
  {/each}
  <a href="?">Create new</a>
</div>

<h2>{data.form.empty ? 'Create' : 'Update'} user</h2>

<form method="POST" use:enhance>
  <label>
    Name<br /><input data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br /><input
      data-invalid={$errors.email}
      bind:value={$form.email}
    />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
  {#if $delayed}Working...{/if}
</form>

<style lang="scss">
  .invalid {
    color: red;
  }
</style>
