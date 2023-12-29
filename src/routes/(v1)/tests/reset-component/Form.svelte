<script>
  import { superForm, superValidateSync } from '$lib/client';
  import { z } from 'zod';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { page } from '$app/stores';

  const schema = z.object({
    id: z.number().min(1).max(255).default(1),
    name: z
      .string()
      .min(2, 'Name must contain at least 2 characters')
      .max(255, 'Name must not exceed 255 characters')
      .default('')
  });

  const data = superValidateSync(schema);

  const { form, errors, enhance, constraints, reset } = superForm(data, {
    SPA: true,
    validators: schema,
    taintedMessage: null,

    onUpdate({ form }) {
      if (form.valid) {
        console.log('form is valid', form.data);
        // TODO: Do something with the validated form.data
      }
    }
  });
</script>

<form method="POST" class="flex flex-col h-[300px] gap-4" use:enhance>
  <input bind:value={$form.id} {...$constraints.id} />
  <input bind:value={$form.name} {...$constraints.name} />

  <button type="submit"> submit</button>
</form>

<br />

<SuperDebug data={{ $form, $errors, 'page.form': $page.form?.form }} />
