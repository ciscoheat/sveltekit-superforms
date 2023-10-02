<script lang="ts">
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schema';

  export let data;

  const Days = [
    'Saturday',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday'
  ];

  const { form, errors, message, tainted, enhance } = superForm(data.form, {
    validators: schema,
    taintedMessage: null
  });
</script>

<SuperDebug data={{ $form, $tainted }} />

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

<button on:click={() => ($form.days = [...$form.days, 3])}
  >Set Tuesday</button
>

<form method="POST" use:enhance>
  <label>
    Name<br />
    <input
      name="name"
      aria-invalid={$errors.name ? 'true' : undefined}
      bind:value={$form.name}
    />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <div class="checkboxes">
    {#each Days as day, i}
      <div class="checkbox">
        <input
          id="wday-{i}"
          type="checkbox"
          name="days"
          value={i}
          bind:group={$form.days}
          class="w-4 h-4 text-skin-accent bg-skin-fg rounded focus:ring-skin-accent focus:ring-2 cursor-pointer"
        />
        <label for="wday-{i}" class="ml-2 text-sm font-medium cursor-pointer"
          >{day}</label
        >
      </div>
    {/each}
  </div>
  <p class="invalid">{$errors.days?._errors || 'No error'}</p>
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
  .checkboxes,
  .checkbox {
    display: flex;
  }
</style>
