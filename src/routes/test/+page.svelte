<script lang="ts">
  import { stringProxy, superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const { form, errors, message, delayed, timeout, enhance } = superForm(
    data.form,
    {
      taintedMessage: undefined,
      onError: 'Något gick fel.',
      validators: {
        email: (n) =>
          /[\w\.-]+@[\w\.]+\.\w+/.test(n) ? null : 'Invalid email'
      }
    }
  );

  const {
    form: modalForm,
    allErrors: modalErrors,
    message: modalMessage,
    delayed: modalDelayed,
    enhance: modalEnhance
  } = superForm({
    taintedMessage: undefined,
    dataType: 'formdata',
    applyAction: false,
    invalidateAll: false
  });

  const bool = stringProxy(form, 'bool', 'boolean');
  const proxyNumber = stringProxy(form, 'proxyNumber', 'int');
  const fields = [
    'nullableString',
    'nullishString',
    'optionalString',
    'trimmedString'
  ] as const;
</script>

<SuperDebug data={$form} />

<form method="POST" action="/test/login" use:modalEnhance>
  <div data-message>
    {#each $modalErrors as error}• {error.value}<br />{/each}
  </div>
  <div>Email</div>
  <input bind:value={$modalForm.name} />
  <div>Password</div>
  <input bind:value={$modalForm.password} />
  <button data-submit>Login</button>
</form>

<h1>sveltekit-superforms</h1>

{#if $message}
  <h3>{$message}</h3>
{/if}

<form method="POST" action="?/form" use:enhance>
  <div>
    <button>Submit</button>
    {#if $timeout}
      <span class="timeout">Timeout!</span>
    {:else if $delayed}
      <span class="delayed">Delayed...</span>
    {/if}
  </div>

  <label for="string">string</label>
  <input type="text" name="string" bind:value={$form.string} />
  {#if $errors.string}<span data-invalid>{$errors.string}</span>{/if}

  <label for="email">email</label>
  <input type="text" name="email" bind:value={$form.email} />
  {#if $errors.email}<span data-invalid>{$errors.email}</span>{/if}

  <label for="bool">bool</label>
  <select name="bool" bind:value={$bool}>
    <option value="true">true</option>
    <option value="">false</option>
  </select>
  {#if $errors.bool}<span data-invalid>{$errors.bool}</span>{/if}

  <label for="number">number</label>
  <input type="number" name="number" bind:value={$form.number} />
  delay ms
  {#if $errors.number}<span data-invalid>{$errors.number}</span>{/if}

  <label for="proxyNumber">proxyNumber</label>
  <input type="text" name="proxyNumber" bind:value={$proxyNumber} />
  {#if $errors.proxyNumber}<span data-invalid>{$errors.proxyNumber}</span
    >{/if}

  {#each fields as key}
    <label for={key}>{key}</label>
    <input type="text" name={key} bind:value={$form[key]} />
    {#if $errors[key]}<span data-invalid>{$errors[key]}</span>{/if}
  {/each}

  <div>
    <button>Submit</button>
    {#if $timeout}
      <span class="timeout">Timeout!</span>
    {:else if $delayed}
      <span class="delayed">Delayed...</span>
    {/if}
  </div>
</form>

<style lang="scss">
  [data-invalid] {
    color: red;
  }

  form[action='/test/login'] {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 10px;
    align-items: baseline;
    width: min-content;
    padding: 10px;
    background-color: gainsboro;
    border-radius: 4px;

    [data-message] {
      font-weight: bold;
      color: red;
      grid-column: 1 / -1;
    }

    button {
      grid-column-start: 2;
      justify-self: left;
    }
  }
</style>
