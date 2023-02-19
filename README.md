# sveltekit-superforms

Supercharge your SvelteKit forms with this powerhouse of a library.

## Feature list

- Merging `PageData` and `ActionData` - Stop worrying about which one to use and how, just focus on your data structures.
- Server-side data validation with error output that can be used directly on the client.
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
