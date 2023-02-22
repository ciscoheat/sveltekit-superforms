# sveltekit-superforms 💥

Supercharge your SvelteKit forms with this powerhouse of a library!

## Feature list

- Merging `PageData` and `ActionData` - Stop worrying about which one to use and how, just focus on your data.
- Server-side data validation using [Zod](https://zod.dev), with output that can be used directly on the client.
- Auto-centering and auto-focusing on invalid form fields.
- Tainted form detection, prevents the user from losing data if navigating away from an unsaved form.
- No JS required as default, but full support for progressive enhancement.
- Automatically coerces the string data from `FormData` into correct types.
- For advanced data structures, forget about the limitations of `FormData` - Send your forms as devalued JSON, transparently.
- Generates default form values from validation schemas.
- Client-side validators for direct feedback.
- Proxy objects for handling data conversions to string and back again.
- Provide feedback unlike anything else with auto-updating timers for long response times, based on [The 3 important limits](https://www.nngroup.com/articles/response-times-3-important-limits/).
- Even more care for the user: No form data loss, by preventing error page rendering as default.
- Hook into a number of events for full control over submitting, `ActionResult` and validation updates.
- Complete customization with options like `applyAction`, `invalidateAll`, `autoFocus`, `resetForm`, etc...
- Comes with a Super Form Debugging Svelte Component.
- ...and probably a lot more!

## Installation

```
(p)npm i -D sveltekit-superforms zod
```

## Get started

Let's gradually build up a super form, starting with just displaying the data for a name and an email address.

**src/routes/+page.server.ts**

```ts
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import { superValidate } from 'sveltekit-superforms/server';

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
  import type { PageData } from './$types';
  import { superForm } from 'sveltekit-superforms/client';

  export let data: PageData;

  // This is where the magic happens.
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

Optional: Add this to `<head>` for a much nicer visual experience:

**src/app.html**

```html
<link rel="stylesheet" href="https://unpkg.com/sakura.css/css/sakura.css" />
```

What we see now is rather basic, and there is no form action to submit to, but we can at least see that the form is populated. To get deeper insight, let's add the Super Form Debugging Svelte Component:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  import SuperDebug from 'sveltekit-superforms/client/SuperDebug.svelte';
</script>

<SuperDebug data={$form} />
```

Edit the fields and see how the `$form` store is automatically updated. It even displays the current page status in the right corner.

## Posting - Without any bells and whistles

Let's add a minimal form action:

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

- `success` - A `boolean` which tells you whether the validation succeeded or not.
- `errors` - A `Record<string, string[]>` of all validation errors.
- `data` - The coerced posted data, in this case not valid, so it should be promptly returned to the client.
- `empty` - A `boolean` which tells you if the data passed to `superValidate` was empty, as in the load function.
- `message` - A `string` property that can be set as a general information message.

And as you see in the example above, the logic for checking validation status is as simple as it gets:

```ts
if (!form.success) {
  return fail(400, { form });
}
```

If you submit the form now, you'll see that the Super Form Debugging Svelte Component shows a `400` status, and we do have some errors being sent to the client, so how do we display them?

We do that by adding variables to the destructuring assignment of `superForm`:

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  const { form, errors } = superForm(data.form);
  //            ^^^^^^
</script>

<form method="POST">
  <label for="name">Name</label>
  <input
    type="text"
    name="name"
    data-invalid={$errors.name}
    bind:value={$form.name}
  />
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <label for="email">E-mail</label>
  <input
    type="text"
    name="email"
    data-invalid={$errors.email}
    bind:value={$form.email}
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

And with that, we have a fully working form, no JavaScript needed, with convenient handling of data and validation!

# But wait, there's more

Have we even started on the feature list? Well, let's move into the 2000's and activate JavaScript, and see what will happen.

Let's start with retrieving a simple but most useful variable returned from `superForm`:

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
taintedMessage: string | false = '<A default message in english>'
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
onUpdated: ({ validation }) => void
```

If you just want to apply the default behaviour and do something afterwards depending on validation success, this is the simplest way.

```ts
onUpdate: ({ validation, cancel }) => void
```

A bit more control, lets you enter just before the form update is being applied and gives you the option to modify the `validation` object, or `cancel()` the update altogether.

```ts
onError: (({ result, message }) => void) | 'set-message' | 'apply' | string = 'set-message'
```

It's soon explained that [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) errors are handled separately, to avoid data loss. This event gives you more control over the error than the default, which is to set the `message` store to the error value.

By setting onError to `apply`, the default `applyAction` behaviour will be used, effectively rendering the nearest `+error` boundary. Or you can set it to a custom error message.

```ts
onSubmit: SubmitFunction;
```

See SvelteKit docs for the [SubmitFunction](https://kit.svelte.dev/docs/types#public-types-submitfunction) signature.

```ts
onResult: ({ result, update, formEl, cancel }) => void
```

When you want detailed control, this event gives you the [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) in `result` and an `update` function, so you can decide if you want to update the form at all.

The `update(result, untaint?)` function takes an `ActionResult` which is **not** of type `error`, and an optional `untaint` parameter, which can be used to untaint the form, so the dialog won't appear when navigating away. If not specified, result types `success` and `redirect` will untaint the form.

`formEl` is the `HTMLFormElement` of the form.

`cancel()` is a function which will completely cancel the rest of the event chain and any form updates. It's not the same as not calling `update`, since without cancelling, the SvelteKit [use:enhance](https://kit.svelte.dev/docs/form-actions#progressive-enhancement-use-enhance) behaviour will kick in, with some notable changes:

## Differences from SvelteKit's use:enhance

(Knowing about [ActionResult](https://kit.svelte.dev/docs/types#public-types-actionresult) is useful before reading this section.)

The biggest difference is that unless `onError` is set to `apply`, any `error` result is transformed into `failure`, to avoid disaster when the nearest `+error.svelte` page is rendered, wiping out all the form data that was just entered.

The rest of the behavior can be customized:

```ts
applyAction: boolean = true;
invalidateAll: boolean = true;
resetForm: boolean = false;
```

As you see, another difference is that the form isn't resetted by default. This should also be opt-in to avoid data loss, and this isn't always wanted, especially in backend interfaces, where the form data should be persisted. In any case, since we're binding the fields to `$form`, the html form reset behavior doesn't make much sense, so in `sveltekit-superforms` resetting means going back to the initial state of the form data, usually the contents of `form` in `PageData`. If you're depending heavily on default values, this may not always be what you want.

## More options: Client-side validators

Since there is already a browser standard for [client-side form validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation), the client-side validation of `sveltekit-superforms` is just doing the basics:

```ts
validators: {
  field: (value) => string | null | undefined;
}
```

An object with the same keys as the form, with a function that receives the field value and should return either a string as a "validation failed" message, or `null` or `undefined` if the field is valid.

Here's an example of how to validate a string length:

**src/routes/+page.svelte**

```ts
const { form, errors, enhance } = superForm(data.form, {
  validators: {
    name: (value) =>
      value.length < 3 ? 'Name must be at least 3 characters' : null
  }
});
```

There is one other options for specifying the default client validation behavior, when no custom validator exists for a field:

```ts
defaultValidator: 'keep' | 'clear' = 'keep'
```

If set to `keep`, validation errors will be kept displayed until the form submits (see next option). If `clear`, the field error will be removed when the value is modified.

## Submit behavior

Making the user understand that things are happening when they submit the form is imperative for the best possible user experience. Fortunately, there are plenty of options that facitilates that, with sensible defaults.

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

The reason for not using `submittting` here is based on the article [Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/), which states that for short waiting periods, no feedback is required except to display the result. Therefore, `delayed` is used to show a loading indicator.

Experimenting with these three timers and the delays between them, is certainly possible to prevent the feeling of unresponsiveness in many cases. Please share your results, if you do!

```ts
multipleSubmits: 'prevent' | 'allow' | 'abort' = 'prevent'
```

This one is more for the sake of the server than the user. When set to `prevent`, the form cannot be submitted again until a result is received, or the `timeout` state is reached. `abort` is the next sensible approach, which will cancel the previous request before submitting again. Finally, `allow` will allow any number of frenetic clicks on the submit button!

## The last one: Breaking free from FormData

I've been saving the best for last - If you're fine with JavaScript being a requirement for posting, you can bypass the annoyance that everything is a `string` when we are posting forms:

```ts
dataType: 'form' | 'formdata' | 'json' = 'form'
```

By simply setting the `dataType` to `json`, you can store any data structure allowed by [devalue](https://github.com/Rich-Harris/devalue) in the form, and you don't have to worry about failed coercion, converting arrays to strings, etc!

If this bliss is too much to handle, setting `dataType` to `formdata`, posts the data as a `FormData` instance based on the data structure instead of the content of the `<form>` element, so you don't have to set names for the form fields anymore (this also applies when set to `json`). This can make the html for a form quite slim:

```svelte
<form method="POST" use:enhance>
  <label>
    Name<br /><input data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br /><input
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

# Designing a CRUD interface

That was the client configuration, now how about the server? Fortunately it's much less work, the `superValidate` function handles most things you can throw at it, and of course [Zod](https://zod.dev/) is an immense help with the actual validation, so you can focus on business logic.

As mentioned, a suitable use case for this library is backend interfaces, which is commonly used as in the acronym **CRUD** (Create, Read, Update, Delete):

1. Display an empty form
1. POST the form, validate the data
1. Create a new entity with the data **(Create)**
1. Fetch the entity **(Read)**
1. Display it in a form
1. POST the form, validate the data
1. Update the entity with the data **(Update)**
1. Delete the entity **(Delete)**
1. ???
1. ~~Profit!~~ `GOTO 1`

This journey can be quite easy to take with `sveltekit-superforms`. Let's see how it works by starting over with the default route:

**src/routes/+page.server.ts**

```ts
import { z } from 'zod';

// See https://zod.dev/?id=primitives for schema syntax
const userSchema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string(),
  email: z.string().email()
});

// Let's worry about id collisions later
const userId = () => String(Math.random()).slice(2);

// A simple user "database"
const users: z.infer<typeof userSchema>[] = [
  {
    id: userId(),
    name: 'Important Customer',
    email: 'important@example.com'
  },
  {
    id: userId(),
    name: 'Super Customer',
    email: 'super@example.com'
  }
];
```

This user database in the shape of an array will be perfect for testing our CRUD operations.

Here we encounter a thing about validation schemas. The `userSchema` is for the database integrity, so an `id` must exist there. But we want to **Create** an entity, and must therefore allow id not to exist when creating users.

This is done by extending the `userSchema`:

**src/routes/+page.server.ts**

```ts
const crudSchema = userSchema.extend({
  id: userSchema.shape.id.optional()
});
```

Except for the `id`, it's worth noting that **Create** and **Update** can use the same schema, so they should naturally share the user interface. This is a fundamental idea in this library, so you can pass either `null/undefined` or an entity to `superValidate`, and it will generate default values in the first case:

**src/routes/+page.server.ts**

```ts
import { setError, superValidate } from '$lib/server';
import { z } from 'zod';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ url }) => {
  // READ user
  // For simplicity, use the id query parameter instead of a route.
  const id = url.searchParams.get('id');
  const user = id ? users.find((u) => u.id == id) : null;

  if (id && !user) throw error(404, 'User not found.');

  const form = await superValidate(user, crudSchema);
  return { form };
}) satisfies PageServerLoad;
```

The page component is quite similar to the previous example.

**src/routes/+page.svelte**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';

  export let data: PageData;

  const { form, errors, enhance, delayed, message } = superForm(data.form);
</script>

<h1>sveltekit-superforms</h1>

{#if $message}
  <h3 class:invalid={$page.status >= 400}>{$message}</h3>
{/if}

<h2>{data.form.empty ? 'Create' : 'Update'} user</h2>

<form method="POST" use:enhance>
  <input type="hidden" name="id" value={$form.id} />

  <label>
    Name<br />
    <input name="name" data-invalid={$errors.name} bind:value={$form.name} />
    {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
  </label>

  <label>
    E-mail<br />
    <input
      name="email"
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

We have prepared to display a status message, utilising `$page.status` to test for success or failure. And we're using the `empty` property of the form to display a "Create" or "Update" title. We shouldn't use the `empty` store returned from `superForm` here, since it will update even when validation fails, so we're using the initial data from the page load.

The form action looks similar to before, but will branch after validation is successful:

```ts
export const actions = {
  default: async (event) => {
    const form = await superValidate(event, crudSchema);
    if (!form.success) return fail(400, { form });

    if (!form.data.id) {
      // CREATE user
    } else {
      // UPDATE user
    }

    return { form };
  }
} satisfies Actions;
```

Here is where you should access your database API. Since we're using an array, the create and update logic is simple:

```ts
if (!form.data.id) {
  // CREATE user
  const user = { ...form.data, id: userId() };
  users.push(user);

  throw redirect(303, '?id=' + user.id);
} else {
  // UPDATE user
  const user = users.find((u) => u.id == form.data.id);
  if (!user) throw error(404, 'User not found.');

  users[users.indexOf(user)] = { ...form.data, id: user.id };

  form.message = 'User updated!';
  return { form };
}
```

With this, we have 3 out of 4 letters of CRUD in about 100 lines of code! The repository code has a more expanded version of this little demo.

# API Reference

## Types

In all examples, `T` represents the validation schema, a type that extends `AnyZodObject`. `z.infer<T>` refers to the underlying type of the schema (the actual data structure).

```ts
export type ValidationErrors<T extends AnyZodObject> = Partial<
  Record<keyof z.infer<T>, string[] | undefined>
>;
```

```ts
export type Validation<T extends AnyZodObject> = {
  success: boolean;
  errors: ValidationErrors<T>;
  data: z.infer<T>;
  empty: boolean;
  message: string | null;
};
```

## Server

```ts
import {
  superValidate,
  setError,
  noErrors,
  actionResult
} from 'sveltekit-superforms/server';
```

**superValidate(data, schema, options?)**

```ts
superValidate(
  data:
    | RequestEvent
    | Request
    | FormData
    | Partial<Record<keyof z.infer<T>, unknown>>
    | null
    | undefined,
  schema: T,
  options?: {
    implicitDefaults = true; // See further down for default entity values
    noErrors = false; // See noErrors() reference further down
  }
): Promise<Validation<T>>
```

If `data` is determined to be empty (`null`, `undefined` or no `FormData`), a validation result with a default entity for the schema is returned, in this form:

```js
{
  success: true;
  errors: {};
  data: z.infer<T>; // See further down for default entity values.
  empty: true;
  message: null;
}
```

**setError(form, field, error)**

```ts
setError(
  form: Validation<T>,
  field: keyof z.infer<T>,
  error: string | string[] | null
) : ActionFailure<{form: Validation<T>}>
```

If you want to set an error on the form outside validation, use `setError`. It returns a `fail(400, { form })` so it can be returned immediately, or more errors can be added by calling it multiple times before returning.

**noErrors(form)**

If you want to return a form with no validation errors. Only the `errors` property will be modified, so `success` still indicates the validation status. Useful for load functions where the entity is invalid, but as a initial state no errors should be displayed on the form.

```ts
noErrors(form: Validation<T>) : Validation<T>
```

**actionResult(type, data?, status?)**

When not using form actions, this constructs an action result in a `Response` object, so you can return `Validation<T>` from your API/endpoints, for example in a login request:

**src/routes/login/+server.ts**

```ts
import { actionResult, superValidate } from '$lib/server';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5)
});

export const POST = (async (event) => {
  const form = await superValidate(event, loginSchema);
  if (!form.success) return actionResult('failure', { form });

  // Verify login here //

  return actionResult('success', { form });
}) satisfies RequestHandler;
```

## Client

```ts
import { superForm } from 'sveltekit-superforms/client';
```

**superForm(form?, options?)**

```ts
superForm(
  form?: FormOptions<T> | Validation<T> | null | undefined,
  options?: FormOptions<T>
) : EnhancedForm<T>
```

```ts
type FormOptions<T extends AnyZodObject> = {
  applyAction?: boolean;
  autoFocusOnError?: boolean | 'detect';
  clearOnSubmit?: 'errors' | 'message' | 'errors-and-message' | 'none';
  dataType?: 'form' | 'formdata' | 'json';
  defaultValidator?: 'keep' | 'clear';
  delayMs?: number;
  errorSelector?: string;
  invalidateAll?: boolean;
  multipleSubmits?: 'prevent' | 'allow' | 'abort';
  resetForm?: boolean;
  scrollToError?: 'auto' | 'smooth' | 'off';
  stickyNavbar?: string;
  taintedMessage?: string | false;
  timeoutMs?: number;
  validators?: Validators<T>;

  onSubmit?: (...params: Parameters<SubmitFunction>) => unknown | void;

  async onResult?: (event: {
    result: ActionResult;
    update: async (
      result: ActionResult<'success', 'failure'>,
      untaint?: boolean
    );
    formEl: HTMLFormElement;
    cancel: () => void;
  })

  async onUpdate?: (event: {
    validation: Validation<T>;
    cancel: () => void;
  })

  async onUpdated?: (event: {
    validation: Validation<T>;
  })

  async onError?:
    | async (
        result: ActionResult<'error'>,
        message: Writable<string | null>
      )
    | 'set-message'
    | 'apply'
    | string;
};
```

```ts
type EnhancedForm<T extends AnyZodObject> = {
  form: Writable<Validation<T>['data']>;
  errors: Writable<Validation<T>['errors']>;
  message: Writable<string | null>;

  success: Readable<boolean>;
  empty: Readable<boolean>;

  submitting: Readable<boolean>;
  delayed: Readable<boolean>;
  timeout: Readable<boolean>;

  firstError: Readable<{ key: string; value: string } | null>;
  allErrors: Readable<{ key: string; value: string }[]>;

  enhance: (el: HTMLFormElement) => ReturnType<typeof formEnhance>;
  reset: () => void;

  async update: (
    result: ActionResult<'success', 'failure'>,
    untaint?: boolean
  )
};
```

## Components

```ts
import SuperDebug from 'sveltekit-superforms/client/SuperDebug.svelte';
```

```svelte
<SuperDebug
  data={any}
  display={true}
  status={true}
  stringTruncate={120}
  ref={HTMLPreElement}
/>
```

# Default entity values

Used when returning default values from `superValidate` for an entity, or when converting `FormData`.

| type            | value       |
| --------------- | ----------- |
| `string`        | `''`        |
| `number`        | `0`         |
| `boolean`       | `false`     |
| `object`        | `{}`        |
| `Array.isArray` | `[]`        |
| `bigint`        | `BigInt(0)` |
| `symbol`        | `Symbol()`  |

## Feedback wanted!

The library is quite stable so don't expect any major changes, but there could still be minor breaking changes until version 1.0.

Ideas, feedback, bug reports, PR:s, etc, are very welcome as a [github issue](https://github.com/ciscoheat/sveltekit-superforms/issues).
