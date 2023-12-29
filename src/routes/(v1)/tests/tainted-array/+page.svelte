<script lang="ts">
  import { superForm, superValidateSync, arrayProxy } from '$lib/client';
  import * as zod from 'zod';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  const schema = zod.object({
    people: zod
      .object({
        firstName: zod.string().min(1),
        lastName: zod.string().min(1)
      })
      .array()
  });

  const pageForm = superForm(superValidateSync(schema), {
    SPA: true,
    validators: schema,
    taintedMessage: null
  });

  const { form, enhance, errors, tainted } = pageForm;

  const { values } = arrayProxy(pageForm, 'people', { taint: false });

  function addPerson() {
    $values = [...$values, { firstName: '', lastName: '' }];
  }
</script>

<SuperDebug data={$tainted} />

<button on:click={addPerson}>Add Person</button>

<form use:enhance>
  {#each $form.people as _, i}
    <div>
      <div>
        <label>First Name</label>
        <input bind:value={$form.people[i].firstName} />
        {#if $errors.people?.[i]?.firstName}
          <p>{$errors.people[i].firstName}</p>
        {/if}
      </div>

      <div>
        <label>Last Name</label>
        <input bind:value={$form.people[i].lastName} />
        {#if $errors.people?.[i]?.lastName}
          <p>{$errors.people[i].lastName}</p>
        {/if}
      </div>
    </div>
  {/each}

  <button type="submit">Submit</button>
</form>
