<script lang="ts">
  import {
    dateProxy,
    intProxy,
    superForm,
    superValidateSync
  } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schema';

  const { errors, enhance, form, tainted } = superForm(
    superValidateSync(schema),
    {
      SPA: true,
      taintedMessage: null,
      validators: schema,
      dataType: 'json',
      onSubmit({ cancel }) {
        if (!$tainted) cancel();
      },
      onUpdate({ form }) {
        if (form.valid) alert('valid');
        else alert('invalid');
      }
    }
  );

  const date = dateProxy(form, 'date', {
    format: 'datetime-local',
    empty: 'undefined'
  });

  const num = intProxy(form, 'number', {
    empty: 'undefined'
  });
</script>

<SuperDebug data={{ $form, $tainted }} />

<form method="POST" use:enhance>
  <label>
    Number: <input name="number" type="number" bind:value={$num} />
    {#if $errors.number}<span class="invalid">{$errors.number}</span>{/if}
  </label>
  <label>
    Name: <input name="date" type="datetime-local" bind:value={$date} />
    {#if $errors.date}<span class="invalid">{$errors.date}</span>{/if}
  </label>
  <div>
    <button>Submit</button>
  </div>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;

    input {
      background-color: #dedede;
    }

    .invalid {
      color: crimson;
    }
  }
</style>
