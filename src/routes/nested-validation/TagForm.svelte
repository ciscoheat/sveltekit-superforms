<script lang="ts">
  import type { Validation, UnwrapEffects } from '$lib';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import type { FormOptions } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schema';
  import * as flashModule from 'sveltekit-flash-message/client';
  import { onMount } from 'svelte';

  export let data: Validation<typeof schema>;
  export let validator: 'zod' | 'superforms';

  export let output: (string[] | undefined)[] = [];

  const superFormValidator: FormOptions<
    typeof schema,
    unknown
  >['validators'] = {
    name: (name) => (!name.length ? 'Name is too short' : null),
    tags: {
      id: (id) => (id < 3 ? 'Id must be larger than 2' : null),
      name: (name) =>
        name.length < 2 ? 'Tags must be at least two characters' : null
    }
  };

  const { form, errors, enhance, message, tainted, validate } = superForm(
    data,
    {
      taintedMessage: null,
      dataType: 'json',
      onUpdate(event) {
        if ($page.url.searchParams.has('cancel')) event.cancel();
      },
      defaultValidator: validator == 'zod' ? 'keep' : 'clear',
      validators: validator == 'zod' ? schema : superFormValidator,
      flashMessage: {
        module: flashModule,
        onError({ result, message }) {
          message.set({
            type: 'error',
            message: result.error.message
          });
        }
      }
    }
  );

  // validate tests
  onMount(async () => {
    if (!$page.url.searchParams.has('test')) return;

    output = [...output, await validate('name')];

    output = [
      ...output,
      await validate(['tags', 0, 'id'], {
        update: false,
        value: 1
      })
    ];

    output = [
      ...output,
      (await validate(['tags', 0, 'id'], {
        update: false,
        value: 7
      })) ?? ['OK']
    ];
  });
</script>

<form method="POST" use:enhance>
  {#if $message}<h4>{$message}</h4>{/if}
  <input type="hidden" name="id" value={validator} />
  <small>{validator} validation</small>

  {#each $form.tags as _, i}
    <div>
      <input
        type="number"
        data-invalid={$errors.tags?.[i]?.id}
        bind:value={$form.tags[i].id}
      />
      <input
        data-invalid={$errors.tags?.[i]?.name}
        bind:value={$form.tags[i].name}
      />
      {#if $errors.tags?.[i]?.id}
        <br />
        <span class="invalid">{$errors.tags[i].id}</span>
      {/if}
      {#if $errors.tags?.[i]?.name}
        <br />
        <span class="invalid">{$errors.tags[i].name}</span>
      {/if}
    </div>
  {/each}
  <div>
    Name: <input type="text" name="name" bind:value={$form.name} />
    {#if $errors.name}<br /><span class="invalid">{$errors.name}</span>{/if}
  </div>

  <button>Submit</button>
</form>

<style lang="scss">
  button {
    margin-right: 20px;
  }

  input:not([type='checkbox']) {
    width: 100px;
  }

  .invalid {
    color: red;
  }
</style>
