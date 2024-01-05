<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import FieldComponent from './FieldComponent.svelte';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data;

	const pageForm = superForm(data.form, {
		dataType: 'json',
		validators: zod(schema)
		//validationMethod: 'onblur'
	});
	const { form, message, enhance, tainted, errors } = pageForm;
</script>

<SuperDebug data={{ $form, $tainted, $errors }} />

<h3>Superforms testing ground</h3>

{#if $message}
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<!-- <label>
    Name<br />
    <input
      name="name"
      aria-invalid={$errors.name ? 'true' : undefined}
      bind:value={$form.name}
    />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label> -->

	<FieldComponent form={pageForm} field="emails" />
	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

<style>
	/* .invalid {
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
  } */
</style>
