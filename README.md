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
- Proxy objects for handling data conversions to string and back again
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

This is rather basic, and we can't even submit the form because there is no form action, but we can at least see that the form is populated. To get full insight, let's add the Super Form Debugging Svelte Component:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  import SuperDebug from '$lib/client/SuperDebug.svelte';
</script>

<SuperDebug data={$form} />
```

Edit the form and see how it's automatically updated. It even displays the current page status in the right corner.

## Posting - Without any bells and whistles

Let's add a minimal form action:

**src/routes/+page.server.ts**

```ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const actions = {
  default: async (event) => {
    // Same syntax as in the load function!
    const form = await superValidate(event, schema);
    console.log('POST', form);

    // Convenient validation check:
    if (!form.success) {
      // Again, always return { form } and you'll be fine.
      return fail(400, { form });
    }

    // Yep, here too
    return { form };
  }
} satisfies Actions;
```

Submit the form, and see what's happening on the server:

```js
POST {
  success: false,
  errors: { email: [ 'Invalid email' ] },
  data: { name: 'Hello world!', email: '' },
  empty: false,
  message: null
}
```

This is the validation object returned from `superValidate`, containing all you need to handle the rest of the logic:

- `success` - A boolean which gives you the most important information, whether the validation succeeded or not.
- `errors` - A `Record<string, string[]>` of all validation errors.
- `data` - The coerced posted data, in this case not valid, so it should be promptly returned to the client.
- `empty` - A boolean which tells you if the data passed to `superValidate` was empty, as in the load function.
- `message` - A string property that can be set as a general information message.

And as you see in the example above, the logic for checking validation status is as simple as it gets:

```ts
if (!form.success) {
  return fail(400, { form });
}
```

By submitting now, you'll see that the Super Form Debugging Svelte Component shows a `400` status, and we do have some errors being sent to the client, so how do we display them?

We do that by adding variables to the destructuring assignment of `superForm`:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  const { form, errors } = superForm(data.form);
</script>

<form method="POST">
  <label for="name">Name</label>
  <input type="text" name="name" bind:value={$form.name} />
  {#if $errors.name}
    <span data-invalid>{$errors.name}</span>
  {/if}

  <label for="email">E-mail</label>
  <input type="text" name="email" bind:value={$form.email} />
  {#if $errors.email}
    <span data-invalid>{$errors.email}</span>
  {/if}

  <div><button>Submit</button></div>
</form>

<style lang="scss">
  [data-invalid] {
    color: red;
  }
</style>
```

And with that, we have a fully working form without any JavaScript, with convenient handling of data and validation!

# But wait, there's more

Have we even started on the feature list? Well, let's move into the 2000's and activate JavaScript, and see what will happen.

Let's start with adding maybe simplest and most useful variable returned from `superForm`:

```svelte
<script lang="ts">
  const { form, errors, enhance } = superForm(data.form);
</script>

<form method="POST" use:enhance>
```

And with that, we're completely client-side. So what is included in this little upgrade?

This is the beginning of a long list of options for `superForm`, which can be added as an option object:

```ts
const { form, errors, enhance } = superForm(data.form, { lotsOfOptions });
```

## Tainted form check

Try to modify the form fields, then close the tab or open another page in the same tab. A confirmation dialog should prevent you from losing the changes.

```ts
taintedMessage: string | false = '<A default message in english>'
```

When a `success` or a `redirect` result is received, the form is automatically marked as untainted.

## Auto-scroll and focus on errors

It's not evident in our small form, but on larger forms it's nice showing the user where the first error is. There are a couple of options for that:

```ts
scrollToError: 'smooth' | 'auto' | 'off' = 'smooth'
autoFocusOnError: boolean | 'detect' = 'detect'
errorSelector: string | undefined = '[data-invalid]'
stickyNavbar: string | undefined = undefined
```

`scrollToError` is quite self-explanatory.

`autoFocusOnError`: When set to `detect`, it checks if the user is on a mobile device, **otherwise** it will automatically focus on the first error input field. It's prevented on mobile since auto-focusing will open the on-screen keyboard, most likely hiding the validation error.

`errorSelector` is the selector used to find the invalid input fields. The default is `[data-invalid]`, and the first one found on the page will be handled according to the two previous settings.

(Note that currently in the example, the `data-invalid` attribute is set on the error messages, not on the input fields, so auto focusing won't work here in either case.)

`stickyNavbar` - If you have a sticky navbar, set its selector here and it won't be in the way of the errors.

## Events

In order of micro-managing the result, from least to most.

```ts
onUpdated: ({ validation }) => void
```

If you just want to apply the default behaviour and do something additional depending on validation success, this is the simplest way.

```ts
onUpdate: ({ validation, cancel }) => void
```

A bit more control, lets you enter just before the form update is being applied and gives you the option to modify the `validation` object, or `cancel()` the update altogether.

```ts
onSubmit: SubmitFunction;
```

See SvelteKit docs for the [SubmitFunction](https://kit.svelte.dev/docs/types#public-types-submitfunction) signature.

```ts
onError: (({ result, message }) => void) | 'set-message' | 'apply' = 'set-message'
```

It's later explained that [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) errors are handled separately, to avoid data loss. This event gives you more control over the error than the default, which is to set the `message` store to the error value.

By setting onError to `apply`, the default `applyAction` behaviour will be used, effectively rendering the nearest `+error` boundary.

```ts
onResult: ({ result, update, formEl, cancel }) => void
```

When you want detailed control, this event gives you the [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) in `result` and an `update` function, so you can decide if you want to update the form at all.

The `update(result, untaint?)` function takes an `ActionResult` which is **not** of type `error`, and an optional `untaint` parameter, which can be used to untaint the form, so the dialog won't appear when navigating away. If not specified, result types `success` and `redirect` will untaint the form.

`formEl` is the `HTMLFormElement` of the form.

`cancel()` is a function which will completely cancel the rest of the event chain and any form updates. It's not the same as not calling `update`, since without cancelling, the SvelteKit [use:enhance](https://kit.svelte.dev/docs/form-actions#progressive-enhancement-use-enhance) behaviour will kick in, with some notable changes:

## Differences from SvelteKit's use:enhance

(Understanding [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) is useful before reading this section.)

The biggest difference is that unless `onError` is set to `apply`, any `error` result is transformed into `failure`, to avoid disaster when the nearest `+error.svelte` page is rendered, wiping out all the form data that was just entered.

The rest of the behavior can be customized:

```ts
applyAction: boolean = true;
invalidateAll: boolean = true;
resetForm: boolean = false;
```

Another slight difference is that the form isn't resetted by default. This should also be opt-in to avoid data loss.
