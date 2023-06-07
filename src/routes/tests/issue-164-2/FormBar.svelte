<script>
  import { superForm } from '$lib/client';
  import { page } from '$app/stores';

  const { form, enhance, message, formId } = superForm($page.data.barForm, {
    resetForm: true,
    invalidateAll: false
  });
</script>

<div>
  FormBar
  <div>
    {#if $message}
      <div>{$message}</div>
    {/if}
    <form method="POST" use:enhance action="?/barAction">
      <label for="name">Bar Name</label>
      <input type="text" name="name" bind:value={$form.name} />

      <div><button>Submit</button></div>
    </form>
  </div>
</div>
