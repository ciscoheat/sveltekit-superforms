<p align="center">
  <img src="https://github.com/ciscoheat/sveltekit-superforms/raw/main/logo.svg" width="150px" align="center" alt="Superforms logo" />
  <h1 align="center">Superforms 💥</h1>
</p>

<div align="center">
  <a align="center" href="https://superforms.rocks/">https://superforms.rocks/</a>
  <br />
  <a href="https://discord.gg/AptebvVuhB">Discord</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://superforms.rocks/api">API</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://superforms.rocks/faq">FAQ</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.npmjs.com/package/sveltekit-superforms">npm</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/ciscoheat/sveltekit-superforms/issues">Issues</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/ciscoheat/sveltekit-superforms/discussions">Discussions</a>
</div>

<br/>

Making SvelteKit **validation** and **displaying** of forms easier than ever!

# Feature list

- Seamless merging of `PageData` and `ActionData` - Forget about which one to use and how, just focus on your data.
- Server- and client-side data validation using [Zod](https://zod.dev), with output that can be used directly on the client.
- [Auto-centering and auto-focusing](https://superforms.rocks/concepts/error-handling#usage-client) on invalid form fields.
- [Tainted form detection](https://superforms.rocks/concepts/tainted), prevents the user from losing data if navigating away from an unsaved form.
- No JS required as default, but full support for [progressive enhancement](https://superforms.rocks/concepts/enhance).
- Automatically coerces the string data from `FormData` into correct types.
- For advanced data structures, forget about the limitations of `FormData` - [Send your forms as devalued JSON](https://superforms.rocks/concepts/nested-data), transparently.
- Generates [default form values](https://superforms.rocks/default-values) from validation schemas.
- Support for [nested data structures](https://superforms.rocks/concepts/nested-data), [snapshots](https://superforms.rocks/concepts/snapshots) and [multiple forms](https://superforms.rocks/concepts/multiple-forms) on the same page.
- Works both on the server and with [single-page applications](https://superforms.rocks/concepts/spa) (SPA)!
- [Proxy objects](https://superforms.rocks/concepts/proxy-objects) for handling data conversions to string and back again.
- Realtime [client-side validators](https://superforms.rocks/concepts/client-validation) for immediate user feedback.
- Provide submit state feedback with three [auto-updating timers](https://superforms.rocks/concepts/timers), based on human perception research.
- Even more care for the user: No form data loss, by [preventing error page rendering](https://superforms.rocks/concepts/enhance#differences-from-sveltekits-useenhance) as default.
- Hook into [a number of events](https://superforms.rocks/concepts/events) for full control over the validation data and the `ActionResult`, with a possibility to cancel the update at every step.
- Complete customization with a [huge list of options](https://superforms.rocks/api#superformform-options).
- Comes with a Super Debugging Svelte Component: [SuperDebug](https://superforms.rocks/super-debug).

# Installation

```
 npm i -D sveltekit-superforms zod
```

```
 pnpm i -D sveltekit-superforms zod
```

# Get started

Follow the get started tutorial on the website to get a hands-on introduction to Superforms: https://superforms.rocks/get-started

You can also watch this excellent introduction video to see what's possible: https://www.youtube.com/watch?v=MiKzH3kcVfs

# Contributing and sponsoring

Ideas, general feedback, bug reports, PR:s, etc, are very welcome as a Github [issue](https://github.com/ciscoheat/sveltekit-superforms/issues) [discussion](https://github.com/ciscoheat/sveltekit-superforms/discussions), or on the [Discord server](https://discord.gg/AptebvVuhB)!

Now that version 1.0 is released, there will be bug fixes, more support questions on the Discord server, future features to work on, and so on.

If you're using Superforms in non-profit circumstances, the library is completely free, a star on Github is more than enough if you want to give your support. But if you are using Superforms in a commercial project, would you or the company you work for consider donating?

If you have appreciated my support on <a href="https://discord.gg/AptebvVuhB">Discord</a> and <a href="https://github.com/ciscoheat/sveltekit-superforms">Github</a>, or want to ensure that things keep rolling, please support open source software in this way.

[!["Sponsor me on Github"](https://github.com/ciscoheat/sveltekit-superforms/raw/main/github.png)](https://github.com/sponsors/ciscoheat) [!["Buy Me A Coffee"](https://github.com/ciscoheat/sveltekit-superforms/raw/main/buymeacoffee.webp)](https://www.buymeacoffee.com/ciscoheat) [!["Support me on Ko-fi"](https://github.com/ciscoheat/sveltekit-superforms/raw/main/ko-fi.png)](https://ko-fi.com/ciscoheat)
