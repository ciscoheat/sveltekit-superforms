<p align="center">
  <img src="https://github.com/ciscoheat/sveltekit-superforms/raw/main/logo.svg" width="150px" align="center" alt="Superforms logo" />
  <h1 align="center">sveltekit-superforms 💥</h1>
</p>

<div align="center">
  <span>
    Supercharge your SvelteKit forms with this powerhouse of a library!
  </span>
  <br />
  <a href="https://github.com/ciscoheat/sveltekit-superforms/wiki/API-reference">API</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/ciscoheat/sveltekit-superforms/discussions">Discussions</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/ciscoheat/sveltekit-superforms/wiki/FAQ">FAQ</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.npmjs.com/package/sveltekit-superforms">npm</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/ciscoheat/sveltekit-superforms/issues">Issues</a>
</div>

<br/>

## Feature list

- Merging `PageData` and `ActionData` consistently - Forget about which one to use and how, just focus on your data.
- Server-side data validation using [Zod](https://zod.dev), with output that can be used directly on the client.
- Auto-centering and auto-focusing on invalid form fields.
- Tainted form detection, prevents the user from losing data if navigating away from an unsaved form.
- No JS required as default, but full support for progressive enhancement.
- Automatically coerces the string data from `FormData` into correct types.
- For advanced data structures, forget about the limitations of `FormData` - Send your forms as devalued JSON, transparently.
- Generates default form values from validation schemas.
- Support for [multiple forms on the same page](https://github.com/ciscoheat/sveltekit-superforms/wiki/FAQ#are-multiple-forms-on-the-same-page-supported).
- Proxy objects for handling data conversions to string and back again.
- Client-side validators for immediate user feedback.
- Provide long response time feedback with auto-updating timers, based on [The 3 important limits](https://www.nngroup.com/articles/response-times-3-important-limits/).
- Even more care for the user: No form data loss, by preventing error page rendering as default.
- Hook into a number of events for full control over submitting, `ActionResult` and validation updates.
- Complete customization with options like `applyAction`, `invalidateAll`, `autoFocus`, `resetForm`, etc...
- Comes with a Super Form Debugging Svelte Component.
- ...and probably a lot more!

## Installation

```
 npm i -D sveltekit-superforms zod
```
```
 pnpm i -D sveltekit-superforms zod
```

## Get started

Let's gradually build up a super form, with the data for a name and an email address.

**src/routes/+page.server.ts**

```ts
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import { superValidate } from 'sveltekit-superforms/server';

// See https://zod.dev/?id=primitives for schema syntax
const schema = z.object({
  name: z.string().default('Hello world!'), // A default value just to show something
  email: z.string().email()
});

export const load = (async (event) => {
  // Server API:
  const form = await superValidate(event, schema);

  // Always return { form } in load and form actions.
  return { form };
}) satisfies PageServerLoad;
```

`superValidate` takes the data as the first parameter, which could be either:

- the `RequestEvent` in this case
- a `Request`
- `FormData` (usually from the request)
- `null` or `undefined`
- or an entity partially matching the schema.

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { superForm } from 'sveltekit-superforms/client';

  export let data: PageData;

  // Client API:
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

`superForm` is used on the client to display the data, conveniently supplied from `data.form`.

With this, we can at least see that the form is populated. But to get deeper insight, let's add the Super Form Debugging Svelte Component:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  import SuperDebug from 'sveltekit-superforms/client/SuperDebug.svelte';
</script>

<SuperDebug data={$form} />
```

Edit the fields and see how the `$form` store is automatically updated. The component also displays the current page status in the right corner.

**Optional:** If you're starting from scratch, add this to `<head>` for a much nicer visual experience:

**src/app.html**

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/normalize.css@8.0.1/normalize.css"
/>
<link rel="stylesheet" href="https://unpkg.com/sakura.css/css/sakura.css" />
```

## Posting

Let's add a minimal form action, to be able to post the data back to the server:

**src/routes/+page.server.ts**

```ts
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';

export const actions = {
  default: async (event) => {
    // Same syntax as in the load function
    const form = await superValidate(event, schema);
    console.log('POST', form);

    // Convenient validation check:
    if (!form.valid) {
      // Again, always return { form } and things will just work.
      return fail(400, { form });
    }

    // TODO: Do something with the validated data

    // Yep, return { form } here too
    return { form };
  }
} satisfies Actions;
```

Submit the form, and see what's happening on the server:

```js
POST {
  valid: false,
  errors: { email: [ 'Invalid email' ] },
  data: { name: 'Hello world!', email: '' },
  empty: false,
  message: null,
  constraints: {
    name: { required: true },
    email: { required: true }
  }
}
```

This is the validation object returned from `superValidate`, containing all you need to handle the rest of the logic:

- `valid` - A `boolean` which tells you whether the validation succeeded or not.
- `errors` - A `Record<string, string[]>` of all validation errors.
- `data` - The coerced posted data, in this case not valid, so it should be promptly returned to the client.
- `empty` - A `boolean` which tells you if the data passed to `superValidate` was empty, as in the load function.
- `message` - A `string` property that can be set as a general information message.
- `constraints` - An object with [html validation constraints](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#using_built-in_form_validation) than can be spread on input fields.

And as you see in the example above, the logic for checking validation status is as simple as it gets:

```ts
if (!form.valid) {
  return fail(400, { form });
}
```

If you submit the form now, you'll see that the Super Form Debugging Svelte Component shows a `400` status, and there are some errors being sent to the client, so how do we display them?

We do that by adding variables to the destructuring assignment of `superForm`:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  const { form, errors, constraints } = superForm(data.form);
  //            ^^^^^^  ^^^^^^^^^^^
</script>

<form method="POST">
  <label for="name">Name</label>
  <input
    type="text"
    name="name"
    data-invalid={$errors.name}
    bind:value={$form.name}
    {...$constraints.name}
  />
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <label for="email">E-mail</label>
  <input
    type="text"
    name="email"
    data-invalid={$errors.email}
    bind:value={$form.email}
    {...$constraints.email}
  />
  {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}

  <div><button>Submit</button></div>
</form>

<style>
  .invalid {
    color: red;
  }
</style>
```

And with that, we have a fully working form, no JavaScript needed, with convenient handling of data and validation on both client and server!

# But wait, there's more

Have we even started on the feature list? Well, let's move into the 2000's and activate JavaScript, and see what will happen.

Let's start with retrieving a simple but most useful variable returned from `superForm`, and use it on the `<form>`:

```svelte
<script lang="ts">
  const { form, errors, enhance } = superForm(data.form);
  //                    ^^^^^^^
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
taintedMessage: string | null | false = '<A default message in english>'
```

When the page status changes to something between 200-299, the form is automatically marked as untainted.

## Auto-scroll and auto-focus on errors

It's not evident in our small form, but on larger forms it's nice showing the user where the first error is. There are a couple of options for that:

```ts
scrollToError: 'smooth' | 'auto' | 'off' = 'smooth'
autoFocusOnError: boolean | 'detect' = 'detect'
errorSelector: string | undefined = '[data-invalid]'
stickyNavbar: string | undefined = undefined
```

`scrollToError` is quite self-explanatory.

`autoFocusOnError`: When set to `detect`, it checks if the user is on a mobile device, **if not** it will automatically focus on the first error input field. It's prevented on mobile since auto-focusing will open the on-screen keyboard, most likely hiding the validation error.

`errorSelector` is the selector used to find the invalid input fields. The default is `[data-invalid]`, and the first one found on the page will be handled according to the two previous settings.

`stickyNavbar` - If you have a sticky navbar, set its selector here and it won't hide any errors.

## Events

In order of micro-managing the result, from least to most.

```ts
onUpdated: ({ form }) => void
```

If you just want to apply the default behaviour and do something afterwards depending on validation success, `onUpdated` is the simplest way.

```ts
onUpdate: ({ form, cancel }) => void
```

A bit more control, `onUpdate` lets you enter just before the form update is being applied and gives you the option to modify the `form` object (the validation result), or `cancel()` the update altogether.

```ts
onError: (({ result, message }) => void) | 'set-message' | 'apply' | 'ignore' | string = 'set-message'
```

It's soon explained that [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) errors are handled separately, to avoid data loss. `onError` gives you more control over the error than the default, which is to set the `message` store to the error value.

By setting onError to `apply`, the default `applyAction` behaviour will be used, effectively rendering the nearest `+error` boundary. You can instead set it to a custom error message, or ignore errors altogether with `ignore`.

```ts
onSubmit: SubmitFunction;
```

`onSubmit` hooks you in to SvelteKit's `use:enhance` function. See SvelteKit docs for the [SubmitFunction](https://kit.svelte.dev/docs/types#public-types-submitfunction) signature.

```ts
onResult: ({ result, formEl, cancel }) => void
```

When you want detailed control, `onResult` gives you the [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) in `result`, so you can decide if you want to update the form at all. You can modify it, which will be used further down the event chain.

`formEl` is the `HTMLFormElement` of the form.

`cancel()` is a function which will completely cancel the rest of the event chain and any form updates.

A result status between `200-299` will untaint the form.

## Differences from SvelteKit's use:enhance

(Knowing about [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) is useful before reading this section.)

The biggest difference is that unless `onError` is set to `apply`, any `error` result is transformed into `failure`, to avoid disaster when the nearest `+error.svelte` page is rendered, which will wipe out all the form data that was just entered.

If no error occured, you have some options to customize the rest of the behavior:

```ts
applyAction: boolean = true;
invalidateAll: boolean = true;
resetForm: boolean = false;
```

As you see, another difference is that the form isn't resetted by default. This should also be opt-in to avoid data loss, and this isn't always wanted, especially in backend interfaces, where the form data should be persisted.

In any case, since we're binding the fields to `$form`, the html form reset behavior doesn't make much sense, so in `sveltekit-superforms`, resetting means _going back to the initial state of the form data_, usually the contents of `form` in `PageData`. This may not be exactly what you needed, in which case you can use an event to clear the form instead.

It's worth noting that by setting `applyAction` to `false`, multiple forms on the same page can be handle quite easily, since they won't tamper with `$page.form` and `$page.status`, in that case.

## Client-side validation

There is already a browser standard for [client-side form validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation), and the `constraints` store returned from `superForm` can be used to follow it with virtually no effort:

```svelte
<script lang="ts">
  const { form, constraints } = superForm(data.form);
</script>

<input name="email" bind:value={$form.email} {...$constraints.email} />
```

The constraints field is an object, with validation properties mapped from the schema:

```ts
{
  pattern?: string;      // z.string().regex(r)
  step?: number;         // z.number().step(n)
  minlength?: number;    // z.string().min(n)
  maxlength?: number;    // z.string().max(n)
  min?: number | string; // number if z.number.min(n), ISO date string if z.date().min(d)
  max?: number | string; // number if z.number.max(n), ISO date string if z.date().max(d)
  required?: true;       // Not nullable, nullish or optional
}
```

### Custom validation

If think the built-in browser validation is too constraining (pun intented), you can set the `validators` option:

```ts
validators: {
  field: (value) => string | null | undefined;
}
```

It takes an object with the same keys as the form, with a function that receives the field value and should return either a string as a "validation failed" message, or `null` or `undefined` if the field is valid.

Here's how to validate a string length:

**src/routes/+page.svelte**

```ts
const { form, errors, enhance } = superForm(data.form, {
  validators: {
    name: (value) =>
      value.length < 3 ? 'Name must be at least 3 characters' : null
  }
});
```

There is one additional option for specifying the default client validation behavior, when no custom validator exists for a field:

```ts
defaultValidator: 'keep' | 'clear' = 'clear'
```

The default value `clear`, will remove the error when that field value is modified. If set to `keep`, validation errors will be kept displayed until the form submits (unless you change it, see next option).

## Submit behavior

Making the user understand that things are happening when they submit the form is imperative for the best possible user experience. Fortunately, there are plenty of options for that, with sensible defaults.

```ts
clearOnSubmit: 'errors' | 'message' | 'errors-and-message' | 'none' = 'errors-and-message'
delayMs: number = 500
timeoutMs: number = 8000
```

The `clearOnSubmit` option decides what should happen to the form when submitting. It can clear all the `errors`, the `message`, both or none. The default is to clear both. If you don't want any jumping content, which could occur when error messages are removed from the DOM, setting it to `none` can be useful.

The `delayMs` and `timeoutMs` decides how long before the submission changes state. The states are:

```
Idle -> Submitting -> Delayed -> Timeout
        0 ms          delayMs    timeoutMs
```

These states affect the readable stores `submitting`, `delayed` and `timeout` returned from `superForm`. They are not mutually exclusive, so `submitting` won't change to `false` when `delayed` becomes `true`.

A perfect use for these is to show a loading indicator while the form is submitting:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  const { form, errors, enhance, delayed } = superForm(data.form);
  //                             ^^^^^^^
</script>

<div>
  <button>Submit</button>
  {#if $delayed}<span class="delayed">Working...</span>{/if}
</div>
```

The reason for not using `submitting` here is based on the article [Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/), which states that for short waiting periods, no feedback is required except to display the result. Therefore, `delayed` is used to show a loading indicator.

Experimenting with these three timers and the delays between them, is certainly possible to prevent the feeling of unresponsiveness in many cases. Please share your results, if you do!

```ts
multipleSubmits: 'prevent' | 'allow' | 'abort' = 'prevent'
```

This one is more for the sake of the server than the user. When set to `prevent`, the form cannot be submitted again until a result is received, or the `timeout` state is reached. `abort` is the next sensible approach, which will cancel the previous request before submitting again. Finally, `allow` will pass through any number of frenetic clicks on the submit button!

## sveltekit-flash-message support

The sister library to `sveltekit-superforms` is called [sveltekit-flash-message](https://github.com/ciscoheat/sveltekit-flash-message), a useful addon since the `message` property doesn't persist when redirecting to a different page. If you have it installed and configured, you need to specify this option to make things work:

```ts
import * as flashModule from 'sveltekit-flash-message/client';

flashMessage: {
  module: flashModule,
  onError?: (error: ActionResult<'error'>) => App.PageData['flash']
}
```

The flash message is set automatically for every `ActionResult` except `error`, so the `onError` callback is needed to transform errors into your flash message type, or leave it out to disregard them.

## The last one: Breaking free from FormData

I've been saving the best for last - If you're fine with JavaScript being a requirement for posting, you can bypass the annoyance that everything is a `string` when we are posting forms:

```ts
dataType: 'form' 'json' = 'form'
```

By simply setting `dataType` to `json`, you can store any data structure allowed by [devalue](https://github.com/Rich-Harris/devalue) in the form, and you don't have to worry about failed coercion, converting arrays to strings, etc! You don't even have to set names for the form fields anymore, making the html for a form quite slim:

```svelte
<form method="POST" use:enhance>
  <label>
    Name<br /><input data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br /><input
      type="email"
      data-invalid={$errors.email}
      bind:value={$form.email}
    />
    {#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
  {#if $delayed}Working...{/if}
</form>

<style>
  .invalid {
    color: red;
  }
</style>
```

# Proxy objects

Sometimes the form data must be proxied, which could happen when you get a `string` value from an input field, third-party library, etc, and want it to be automatically converted and updating a non-string value in your form data structure. Fortunately, there are a number of objects available for that:

```ts
import {
  intProxy,
  numberProxy,
  booleanProxy,
  dateProxy
} from 'sveltekit-superforms/client';
```

The usage for all of them is the same:

```ts
// Assume the following schema:
// z.object({ id: z.number().int() })

const { form } = superForm(data.form);
const idProxy = intProxy(form, 'id'); // Writable<string>
```

Now if you bind to `$idProxy` instead of directly to `$form.id`, the value will be converted to an integer and `$form.id` will be updated automatically.

Note that this will usually happen automatically with `bind:value`, so check out all the possible [Svelte bindings](https://svelte.dev/tutorial/text-inputs) first, to avoid complicating the code!

# API reference

[Available here](https://github.com/ciscoheat/sveltekit-superforms/wiki/API-reference) at the repository wiki.

# Designing a CRUD interface

A more detailed example of how to create a fully working CRUD (Create, Read, Update, Delete) backend in just a few lines of code is [available here](https://github.com/ciscoheat/sveltekit-superforms/wiki/Designing-a-CRUD-interface).

# FAQ

[Visit the FAQ](https://github.com/ciscoheat/sveltekit-superforms/wiki/FAQ) for answers to questions about multiple forms, file uploads, and much more.

# Feedback wanted!

The library is quite stable so don't expect any major changes, but there could still be minor breaking changes until version 1.0, mostly variable naming.

Ideas, feedback, bug reports, PR:s, etc, are very welcome as a [github issue](https://github.com/ciscoheat/sveltekit-superforms/issues).
