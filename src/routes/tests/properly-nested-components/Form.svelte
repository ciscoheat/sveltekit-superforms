<script lang="ts">
  import type { Validation } from '$lib';
  import type { Schema } from './schemas';
  import { superForm } from '$lib/client';
  import { fieldProxy } from '$lib/client/proxies';
  import TextInput from './TextInput.svelte';
  import TextInput2 from './TextInput2.svelte';
  import TextFormField from './TextFormField.svelte';
  import TextField from './TextField.svelte';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data: Validation<Schema>;

  const supFrm = superForm(data, {
    dataType: 'json'
  });
  const { form, errors, enhance, tainted } = supFrm;

  const name = fieldProxy(form, ['name']);
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
  <section>
    <div>
      <TextInput name="name" field={name} />
      {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
    </div>

    <TextFormField name="address" form={supFrm} field="address" />

    <div>
      <TextInput2
        label="city"
        bind:value={$form.city}
        errors={$errors.city}
        name="city"
      />
    </div>
  </section>

  <section>
    <h4>Tags</h4>
    {#each $form.tags as _, i}
      <TextInput2
        label="Name"
        name="tags"
        bind:value={$form.tags[i].name}
        errors={$errors.tags?.[i]?.name}
      />
    {/each}
  </section>

  <section>
    <button>Submit</button>
  </section>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  section {
    display: flex;
    flex-direction: column;

    button {
      align-self: flex-start;
    }
  }

  .invalid {
    color: crimson;
  }

  h4 {
    margin: 0;
  }
</style>
