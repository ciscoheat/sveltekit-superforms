<script lang="ts">
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data;

  let status = '';

  const { form, enhance, errors } = superForm(data.form, {
    SPA: true,
    resetForm: true,
    validators: {
      title: (value) =>
        value.trim().length >= 3
          ? null
          : 'Bitte geben Sie mindestens 3 Zeichen ein'
    },
    onUpdate: ({ form }) => {
      if (form.valid) {
        // send data;
        status = 'OK';
      } else {
        status = 'Not valid';
      }
    }
  });
</script>

<SuperDebug data={{ $form, $errors }} />

<h3>Superforms testing ground</h3>

<p>{status}</p>

<form method="POST" use:enhance>
  <label>
    Name<br />
    <input
      class="input"
      type="text"
      bind:value={$form.title}
      aria-invalid={errors ? 'true' : undefined}
    />
  </label>
  {#if $errors.title}<div class="invalid">{$errors.title}</div>{/if}

  <button>Submit</button>
</form>

<hr />
<p>
  <a target="_blank" href="https://superforms.rocks/api">API Reference</a>
</p>

<style>
  .invalid {
    color: red;
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
  }
</style>
