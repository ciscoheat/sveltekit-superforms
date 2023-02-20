<script lang="ts">
  import { stringProxy, superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const { form, errors, message, delayed, timeout, enhance } = superForm(data.form, {
    invalidateAll: false,
    taintedMessage: undefined,
    validators: {
      email: (n) => (/[\w\.-]+@[\w\.]+\.\w+/.test(n) ? null : 'Invalid email')
    }
  });

  const bool = stringProxy(form, 'bool', 'boolean');
  const proxyNumber = stringProxy(form, 'proxyNumber', 'int');
  const fields = ['nullableString', 'nullishString', 'optionalString', 'trimmedString'] as const;
</script>

<SuperDebug data={$form} />

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

  <label for="string">string</label> <input type="text" name="string" bind:value={$form.string} />
  {#if $errors.string}<span data-invalid>{$errors.string}</span>{/if}

  <label for="email">email</label> <input type="text" name="email" bind:value={$form.email} />
  {#if $errors.email}<span data-invalid>{$errors.email}</span>{/if}

  <label for="bool">bool</label>
  <select bind:value={$bool}>
    <option value="true">true</option>
    <option value="">false</option>
  </select>
  {#if $errors.bool}<span data-invalid>{$errors.bool}</span>{/if}

  <label for="number">number</label> <input type="number" name="delay" bind:value={$form.number} />
  delay ms
  {#if $errors.number}<span data-invalid>{$errors.number}</span>{/if}

  <label for="proxyNumber">proxyNumber</label>
  <input type="text" name="proxyNumber" bind:value={$proxyNumber} />
  {#if $errors.proxyNumber}<span data-invalid>{$errors.proxyNumber}</span>{/if}

  {#each fields as key}
    <label for={key}>{key}</label> <input type="text" name={key} bind:value={$form[key]} />
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
</style>
