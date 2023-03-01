<script lang="ts">
  import {
    dateProxy,
    intProxy,
    booleanProxy,
    superForm,
    jsonProxy
  } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const {
    form,
    errors,
    message,
    delayed,
    timeout,
    enhance,
    firstError,
    allErrors,
    tainted,
    constraints
  } = superForm(data.form, {
    taintedMessage: null,
    onError: 'Något gick fel.',
    validators: {
      email: (n) =>
        /[\w\.-]+@[\w\.]+\.\w+/.test(n) ? null : 'Invalid email'
    }
  });

  const {
    form: modalForm,
    allErrors: modalErrors,
    message: modalMessage,
    delayed: modalDelayed,
    enhance: modalEnhance
  } = superForm(null, {
    taintedMessage: null,
    dataType: 'formdata',
    applyAction: false,
    invalidateAll: false
  });

  const proxyString = jsonProxy(form, 'proxyString', $form.coercedNumber);
  proxyString.set(123);

  const bool = booleanProxy(form, 'bool', { trueStringValue: '1' });
  const proxyNumber = intProxy(form, 'proxyNumber');
  const date = dateProxy(form, 'date', { format: 'datetime-local' });
  const coercedDate = dateProxy(form, 'coercedDate', {
    format: 'date-local'
  });

  const fields = [
    'nullableString',
    'nullishString',
    'optionalString',
    'trimmedString'
  ] as const;
</script>

<SuperDebug data={{ ...$form, $tainted }} />

<form method="POST" action="/test/login" use:modalEnhance>
  <div data-message>
    {#each $modalErrors as error}• {error.value}<br />{/each}
  </div>
  <div>Email</div>
  <input
    on:input={() => {
      proxyString.set(456);
    }}
    bind:value={$modalForm.name}
  />
  <div>Password</div>
  <input bind:value={$modalForm.password} />
  <button data-submit>Login</button>
</form>

<h1>sveltekit-superforms</h1>

{#if $message}
  <h3>{$message}</h3>
{/if}

{#if $firstError}
  <p>First error: {$firstError.key} - {$firstError.value}</p>
{/if}

{#if $allErrors.length}
  <ul>
    {#each $allErrors as error}
      <li>{error.key}: {error.value}</li>
    {/each}
  </ul>
{/if}

<form method="POST" action="?/form" use:enhance>
  <input type="hidden" name="proxyString" bind:value={$form.proxyString} />

  <input type="hidden" name="numberArray" value="123" />
  <input type="hidden" name="numberArray" value="456" />
  <input type="hidden" name="numberArray" value="789" />

  <div>
    <button>Submit</button>
    {#if $timeout}
      <span class="timeout">Timeout!</span>
    {:else if $delayed}
      <span class="delayed">Delayed...</span>
    {/if}
  </div>

  <label for="string">string</label>
  <input
    type="text"
    name="string"
    bind:value={$form.string}
    {...$constraints.string}
  />
  {#if $errors.string}<span data-invalid>{$errors.string}</span>{/if}

  <label for="email">email</label>
  <input
    type="text"
    data-invalid={$errors.email}
    name="email"
    bind:value={$form.email}
  />
  {#if $errors.email}<span data-invalid>{$errors.email}</span>{/if}

  <label for="bool">bool</label>
  <select name="bool" bind:value={$bool}>
    <option value="1">true</option>
    <option value="">false</option>
  </select>
  {#if $errors.bool}<span data-invalid>{$errors.bool}</span>{/if}

  <label for="number">number</label>
  <input type="number" name="number" bind:value={$form.number} />
  delay ms
  {#if $errors.number}<span data-invalid>{$errors.number}</span>{/if}

  <label for="proxyNumber">proxyNumber</label>
  <!-- Must be text -->
  <input
    type="text"
    name="proxyNumber"
    data-invalid={$errors.proxyNumber}
    bind:value={$proxyNumber}
  />
  {#if $errors.proxyNumber}<span data-invalid>{$errors.proxyNumber}</span
    >{/if}

  <label for="date">proxyDate</label>
  <input type="datetime-local" name="date" bind:value={$date} />
  {#if $errors.date}<span data-invalid>{$errors.date}</span>{/if}

  <label for="date">coercedDate</label>
  <input type="date" name="coercedDate" bind:value={$coercedDate} />
  {#if $errors.coercedDate}<span data-invalid>{$errors.coercedDate}</span
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
