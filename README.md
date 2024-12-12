<p align="center">
  <img src="https://github.com/ciscoheat/sveltekit-superforms/raw/main/logo.svg" width="150px" align="center" alt="Superforms logo" />
  <h1 align="center">Superforms 💥</h1>
  <p align="center">Making SvelteKit forms a pleasure to use!</p>
</p>

<div align="center">
  <a align="center" href="https://superforms.rocks/">https://superforms.rocks/</a>
  <br />
  <a href="https://discord.gg/g5GHjGtU2W">Discord</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://superforms.rocks/api">API</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://superforms.rocks/faq">FAQ</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.npmjs.com/package/sveltekit-superforms">npm</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/ciscoheat/sveltekit-superforms/issues">Issues</a>
</div>

# Feature list

- Server- and client-side validation with your favorite validation libraries, and more to come: 💥 [Arktype](https://arktype.io/) 💥 [class-validator](https://github.com/typestack/class-validator) 💥 [Effect](https://effect.website/) 💥 [Joi](https://joi.dev/) 💥 [Superstruct](https://docs.superstructjs.org/) 💥 [TypeBox](https://github.com/sinclairzx81/typebox) 💥 [Valibot](https://valibot.dev/) 💥 [VineJS](https://vinejs.dev/) 💥 [Yup](https://github.com/jquense/yup) 💥 [Zod](https://zod.dev/) 💥 or use [JSON Schema](https://json-schema.org/) directly.
- Seamless merging of `PageData` and `ActionData` - Forget about how to combine them, just focus on your form data, always strongly typed.
- [Auto-centering and focusing](https://superforms.rocks/concepts/error-handling#usage-client) on invalid form fields.
- [Tainted form detection](https://superforms.rocks/concepts/tainted), prevents the user from losing data if navigating away from an unsaved form. Or use [snapshots](https://superforms.rocks/concepts/snapshots) to save the form state.
- Automatically coerces `FormData` into correct types, including arrays and files.
- For advanced data structures, forget about the limitations of `FormData` - Post [nested data structures](https://superforms.rocks/concepts/nested-data) like a RPC call.
- Generates [default form values](https://superforms.rocks/default-values) from many validation schemas.
- Handles [multiple forms](https://superforms.rocks/concepts/multiple-forms) on the same page.
- Works both on the server and with [single-page applications](https://superforms.rocks/concepts/spa) (SPA)!
- Convenient handling and validation of [file uploads](https://superforms.rocks/concepts/files), both on server and client and even in nested data.
- [Proxy objects](https://superforms.rocks/concepts/proxy-objects) for handling data conversions to string and back again.
- Realtime [client-side validation](https://superforms.rocks/concepts/client-validation) for the best possible UX.
- Create loading spinners easily with three [auto-updating timers](https://superforms.rocks/concepts/timers), based on human perception research.
- Hook into [a number of events](https://superforms.rocks/concepts/events) for full control over the validation data and the `ActionResult`, with a possibility to cancel the update at every step.
- Complete customization with a [huge list of options](https://superforms.rocks/api#superformform-options).
- No JavaScript required as default, but full support for [progressive enhancement](https://superforms.rocks/concepts/enhance).
- Comes with a Super Debugging Svelte Component: [SuperDebug](https://superforms.rocks/super-debug).

# Get started

Follow the Get started tutorial on the website to get a hands-on introduction to Superforms: https://superforms.rocks/get-started

You can also watch this excellent introduction video to see what's possible: https://www.youtube.com/watch?v=MiKzH3kcVfs

# Help & support

- If you're using Superforms in non-profit circumstances, support is completely free; a star on [Github](https://github.com/ciscoheat/sveltekit-superforms) is more than enough to show your appreciation. Join the [#free-support](https://discord.gg/8X9Wfb2wbz) channel on Discord and ask away!
- If you're making or aiming to make money on your project, a donation proportional to the current profit of the project or the company you work for, will give you a month of commercial support. Donate with one of the options [on the website](https://superforms.rocks/support#commercial-support), then ask in the [#commercial-support](https://discord.gg/m6hUXE4eNQ) channel on Discord.

# Contributing

General feedback, feature requests, bug reports, PR:s, are very welcome as a Github [issue](https://github.com/ciscoheat/sveltekit-superforms/issues) or on the [Discord server](https://discord.gg/g5GHjGtU2W)!

# Donating

If you appreciate the hard work behind Superforms, please support open source software with a donation.

[!["Sponsor me on Github"](https://github.com/ciscoheat/sveltekit-superforms/raw/main/github.png)](https://github.com/sponsors/ciscoheat) [!["Buy Me A Coffee"](https://github.com/ciscoheat/sveltekit-superforms/raw/main/buymeacoffee.webp)](https://www.buymeacoffee.com/ciscoheat) [!["Support me on Ko-fi"](https://github.com/ciscoheat/sveltekit-superforms/raw/main/ko-fi.png)](https://ko-fi.com/ciscoheat)
