<script lang="ts">
  import type { FormPath, Validation } from '$lib';
  import type { Schema } from './schemas';
  import { superForm } from '$lib/client';
  import TextInput from './TextInput.svelte';
  import TextFormField from './TextFormField.svelte';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { fieldProxy, formFieldProxy } from '$lib/client/proxies';

  import type { z } from 'zod';

  export let data: Validation<Schema>;

  const theForm = superForm(data, {
    dataType: 'json'
  });
  const { form, errors, enhance, constraints } = theForm;

  const proxy1 = formFieldProxy(theForm, 'name');
  const proxy2 = formFieldProxy(theForm, ['name']);
  const proxy3 = formFieldProxy(theForm, ['tags', 3]);
  const proxy4 = formFieldProxy(theForm, ['luckyNumber']);

  let field1 = fieldProxy(form, 'luckyNumber');
  /*
  field1 = 123;

  proxy1.value = '123';
  proxy2.value = '123';
  proxy3.value = { name: 'Test' };
  proxy4.value = 123;
  */
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
  <section>
    <div>
      <TextInput label="name" bind:value={$form.name} />
    </div>

    <TextFormField form={theForm} field="address" />

    <div>
      <TextInput
        label="city"
        bind:value={$form.city}
        errors={$errors.city}
        constraints={$constraints.city}
        name="city"
      />
    </div>
  </section>

  <section>
    <h4>Tags</h4>
    {#each $form.tags as _, i}
      <TextInput
        label="Name"
        name="tags"
        bind:value={$form.tags[i].name}
        errors={$errors.tags?.[i]?.name}
        constraints={$constraints.tags?.name}
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

  h4 {
    margin: 0;
  }
</style>
