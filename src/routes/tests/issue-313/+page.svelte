<script lang="ts">
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data;
  export let form;

  const {
    form: loginForm,
    errors,
    message,
    enhance
  } = superForm(data.loginForm);
</script>

<SuperDebug data={$loginForm} />

<p>{form?.form.data.name}</p>

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

<form method="POST" use:enhance>
  <label>
    Name<br />
    <input
      name="name"
      aria-invalid={$errors.name ? 'true' : undefined}
      bind:value={$loginForm.name}
    />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    Email<br />
    <input
      name="email"
      type="email"
      aria-invalid={$errors.email ? 'true' : undefined}
      bind:value={$loginForm.email}
    />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>
  {#if form?.isFail}
    fail
  {/if}
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
</style>
