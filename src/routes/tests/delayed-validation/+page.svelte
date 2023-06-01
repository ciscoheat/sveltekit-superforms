<script lang="ts">
  import type { PageData } from './$types';
  import { superForm } from '$lib/client';
  import { basicSchema } from './schema';
  import { page } from '$app/stores';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { debounce } from 'throttle-debounce';

  export let data: PageData;

  async function checkUsername(
    username: string,
    resolve: (result: string | null) => void
  ) {
    const body = new FormData();
    body.set('username', username);

    const response = await fetch(
      new URL('/tests/delayed-validation/username', $page.url),
      {
        method: 'POST',
        body
      }
    );

    resolve(response.status == 200 ? null : 'This username is taken.');
  }

  const throttledUsername = debounce(300, checkUsername);

  const { form, errors, message, enhance, tainted } = superForm(data.form, {
    dataType: 'json',
    validators: basicSchema,
    delayedValidators: {
      username: (username) =>
        new Promise<string | null>((resolve) =>
          throttledUsername(username, resolve)
        )
    }
  });
</script>

<h3>Delayed validation</h3>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}
  <h4>Message: {$message}</h4>
{/if}

<form method="POST" use:enhance>
  <label for="name">Name</label>
  <input
    type="text"
    name="name"
    data-invalid={$errors.name}
    bind:value={$form.name}
  />
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <label for="username">Username</label>
  <input
    type="text"
    name="username"
    data-invalid={$errors.username}
    bind:value={$form.username}
  />
  {#if 'username' in $errors}<span class="invalid"
      >{$errors.username ? '❌' : '✅'}</span
    >{/if}

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
