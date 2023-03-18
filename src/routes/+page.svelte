<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import * as flashModule from 'sveltekit-flash-message/client';
  import Input from './Input.svelte';

  export let data: PageData;

  const {
    form,
    errors,
    enhance,
    message,
    delayed,
    reset,
    constraints,
    fields
  } = superForm(data.form, {
    dataType: 'json',
    async onUpdate({ form }) {
      console.log('onUpdate', form);
      if (form.valid) {
        await goto('?id=' + form.data.id);
      }
    },
    flashMessage: {
      module: flashModule,
      onError({ result, message }) {
        message.set({
          type: 'error',
          message: result.error.message
        });
      }
    }
  });

  const {
    form: staticform,
    errors: staticerrors,
    constraints: staticconstraints
  } = superForm(data.form, { id: 'static' });
</script>

<SuperDebug data={{ $form, $staticform }} />

<a href="/test">Test page</a> | <a href="/crud">CRUD</a> |
<a href="/super-debug">SuperDebug</a>
| <a href="/nested">Nested</a>

{#if $message}
  <h4 class:error={$page.status >= 400} class="message">{$message}</h4>
{/if}

<h1>sveltekit-superforms</h1>

<div class="users">
  <b>Select customer:</b>
  {#each data.users as user}
    | <a href="?id={user.id}">{user.name}</a> |
  {/each}
  {#if !data.form.empty}
    <button on:click={() => goto('?')}>Create new</button>
  {/if}
</div>

<h2>{data.form.empty ? 'Create' : 'Update'} user</h2>

<div class="forms">
  <form method="POST" action="?/edit" use:enhance>
    <input type="hidden" name="id" bind:value={$form.id} />
    <input type="hidden" name="notInSchema" value="123" />

    <label>
      Name<br /><input
        name="name"
        data-invalid={$errors.name}
        bind:value={$form.name}
        {...$constraints.name}
      />
      {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
    </label>

    <Input label="E-mail" field={$fields.email} />
    <Input label="Gender" field={$fields.gender} />

    <div>
      <button>Submit</button>
      <input type="checkbox" name="error" style="margin-left:1rem;" />
      Trigger error
      {#if $delayed}Working...{/if}
    </div>

    <div style="height:1200px;">&nbsp;</div>

    <div>
      <button>Submit</button>
      {#if $delayed}Working...{/if}
    </div>

    <div>&nbsp;</div>

    <div>
      <button on:click|preventDefault={() => reset()}>Reset</button>
    </div>
  </form>

  <!--------- Static form (no javascript/enhance) ----------------------->
  <form method="POST" action="?/edit">
    <input type="hidden" name="id" bind:value={$staticform.id} />
    <input type="hidden" name="formid" value="static" />

    <label>
      Name<br /><input
        name="name"
        data-invalid={$staticerrors.name}
        bind:value={$staticform.name}
        {...$staticconstraints.name}
      />
      {#if $staticerrors.name}<span class="invalid"
          >{$staticerrors.name}</span
        >{/if}
    </label>

    <label>
      E-mail<br /><input
        type="email"
        name="email"
        data-invalid={$staticerrors.email}
        bind:value={$staticform.email}
        {...$staticconstraints.email}
      />
      {#if $staticerrors.email}<span class="invalid"
          >{$staticerrors.email}</span
        >{/if}
    </label>

    <label>
      Gender<br /><input
        name="gender"
        data-invalid={$staticerrors.gender}
        bind:value={$staticform.gender}
        {...$staticconstraints.gender}
      />
      {#if $staticerrors.gender}<span class="invalid"
          >{$staticerrors.gender}</span
        >{/if}
    </label>

    <div>
      <button>Submit</button>
      <input type="checkbox" name="error" style="margin-left:1rem;" />
      Trigger error
      {#if $delayed}Working...{/if}
    </div>

    <div style="height:1200px;">&nbsp;</div>

    <div>
      <button>Submit</button>
      {#if $delayed}Working...{/if}
    </div>

    <div>&nbsp;</div>

    <div>
      <button on:click|preventDefault={() => reset()}>Reset</button>
    </div>
  </form>
</div>

<button on:click={() => ($form.id = 'Test')}>Set form id</button>

<style lang="scss">
  .forms {
    display: flex;
    justify-content: space-between;
    gap: 50px;
  }

  .invalid {
    color: red;
  }

  .message {
    color: white;
    padding: 10px;
    background-color: rgb(46, 168, 68);

    &.error {
      background-color: rgb(168, 60, 46);
    }
  }
</style>
