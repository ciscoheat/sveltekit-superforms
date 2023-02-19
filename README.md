# sveltekit-superforms

Supercharge your SvelteKit forms with this powerhouse of a library.

## Feature list

- Merging `PageData` and `ActionData` - Stop worrying about which one to use and how, just focus on your data structures.
- Server-side data validation, with error output that can be used conveniently on the client.
- Auto-centering and auto-focusing on invalid form fields.
- Tainted form detection, prevents the user from losing data if navigating away from an unsaved form.
- Full support for progressive enhancement - No JS needed if you don't want to.
- Coerces the strings from `FormData` into correct types.
- For advanced data structures, forget about the limitations of `FormData` - Send your forms as devalued JSON, transparently.
- Client-side validators for direct feedback.
- Generate default form values from validation schemas.
- Give feedback with auto-updating timers for long response times, based on [The 3 important limits](https://www.nngroup.com/articles/response-times-3-important-limits/).
- Even more care for the user: No form data loss by preventing error page rendering.
- Hook into a number of events for full control over submitting, result, updates...
- Customize whether to use `applyAction`, `invalidateAll`, `autoFocus`, `resetForm`, etc...
- Comes with a Super Form Debugging Svelte Component.
- ...and probably a lot more!

## Installation

```
(p)npm i -D sveltekit-superforms zod
```

## Get started

Let's gradually build up a complete super form, starting with just displaying the data for a name and an email address.

**src/routes/+page.server.ts**

```ts
import { superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

// See https://zod.dev/?id=primitives for schema syntax
const schema = z.object({
  name: z.string().default('Hello world!'),
  email: z.string().email()
});

export const load = (async (event) => {
  const form = await superValidate(event, schema);

  // Always return { form } and you'll be fine.
  return { form };
}) satisfies PageServerLoad;
```

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';

  export let data: PageData;

  const { form } = superForm(data.form);
</script>

<h1>sveltekit-superforms</h1>

<form method="POST">
  <label for="name">Name</label>
  <input type="text" name="name" bind:value={$form.name} />

  <label for="email">E-mail</label>
  <input type="text" name="email" bind:value={$form.email} />

  <div><button>Submit</button></div>
</form>
```

This is rather basic, and we can't even submit the form because there is no form action, but we can at least see that the form is populated.

## More

```ts
export const actions = {
  form: async (event) => {
    const form = await superValidate(event, _dataTypeForm);
    console.log('🚀 ~ POST', form);

    if (!form.success) return fail(400, { form });
    else form.message = 'Form posted!';

    await new Promise((resolve) => setTimeout(resolve, form.data.number));

    return { form };
  }
} satisfies Actions;
```

**src/routes/+page.svelte**

```svelte

```
