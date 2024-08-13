<script context="module">
	/*! clipboard-copy. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */

	function makeError() {
		return new DOMException('The request is not allowed', 'NotAllowedError');
	}

	/**
	 * @param {string} text
	 */
	async function copyClipboardApi(text) {
		// Use the Async Clipboard API when available. Requires a secure browsing
		// context (i.e. HTTPS)
		if (!navigator.clipboard) {
			throw makeError();
		}
		return navigator.clipboard.writeText(text);
	}

	/**
	 * @param {string} text
	 */
	async function copyExecCommand(text) {
		// Put the text to copy into a <span>
		const span = document.createElement('span');
		span.textContent = text;

		// Preserve consecutive spaces and newlines
		span.style.whiteSpace = 'pre';
		span.style.webkitUserSelect = 'auto';
		span.style.userSelect = 'all';

		// Add the <span> to the page
		document.body.appendChild(span);

		// Make a selection object representing the range of text selected by the user
		const selection = window.getSelection();
		const range = window.document.createRange();
		selection?.removeAllRanges();
		range.selectNode(span);
		selection?.addRange(range);

		// Copy text to the clipboard
		let success = false;
		try {
			success = window.document.execCommand('copy');
		} finally {
			// Cleanup
			selection?.removeAllRanges();
			window.document.body.removeChild(span);
		}

		if (!success) throw makeError();
	}

	/**
	 * @param {string} text
	 */
	async function clipboardCopy(text) {
		try {
			await copyClipboardApi(text);
		} catch (err) {
			// ...Otherwise, use document.execCommand() fallback
			try {
				await copyExecCommand(text);
			} catch (err2) {
				throw err2 || err || makeError();
			}
		}
	}
</script>

<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { readable, get } from 'svelte/store';

	let styleInit = false;

	/**
	 * @typedef {unknown | Promise<unknown>} EncodeableData
	 * @typedef {import('svelte/store').Readable<EncodeableData>} EncodeableDataStore
	 *
	 * @typedef {EncodeableData | EncodeableDataStore} DebugData
	 */

	/**
	 * Data to be displayed as pretty JSON.
	 *
	 * @type {DebugData}
	 */
	export let data;
	/**
	 * Controls when the component should be displayed.
	 *
	 * Default: `true`.
	 */
	export let display = true;
	/**
	 * Controls when to show the HTTP status code of the current page (reflecs the status code of the last request).
	 *
	 * Default is `true`.
	 */
	export let status = true;
	/**
	 * Optional label to identify the component easily.
	 */
	export let label = '';
	/**
	 * Controls the maximum length of a string field of the data prop.
	 *
	 * Default is `120` characters. Set to `0` to disable trimming.
	 */
	export let stringTruncate = 120;
	/**
	 * Reference to the pre element that contains the data.
	 *
	 * @type {HTMLPreElement | undefined}
	 */
	export let ref = undefined;
	/**
	 * Controls if the data prop should be treated as a promise (skips promise detection when true).
	 *
	 * Default is `false`.
	 * @deprecated Promises are auto-detected from 1.3.0.
	 */
	export let promise = false;
	/**
	 * Controls if the data prop should be treated as a plain object (skips promise and store detection when true, prevails over promise prop).
	 *
	 * Default is `false`.
	 */
	export let raw = false;
	/**
	 * Enables the display of fields of the data prop that are functions.
	 *
	 * Default is `false`.
	 */
	export let functions = false;
	/**
	 * Theme, which can also be customized with CSS variables:
	 *
	 * ```txt
	 * --sd-bg-color
	 * --sd-label-color
	 * --sd-promise-loading-color
	 * --sd-promise-rejected-color
	 * --sd-code-default
	 * --sd-info
	 * --sd-success
	 * --sd-redirect
	 * --sd-error
	 * --sd-code-key
	 * --sd-code-string
	 * --sd-code-date
	 * --sd-code-boolean
	 * --sd-code-number
	 * --sd-code-bigint
	 * --sd-code-null
	 * --sd-code-nan
	 * --sd-code-undefined
	 * --sd-code-function
	 * --sd-code-symbol
	 * --sd-code-error
	 * --sd-sb-width
	 * --sd-sb-height
	 * --sd-sb-track-color
	 * --sd-sb-track-color-focus
	 * --sd-sb-thumb-color
	 * --sd-sb-thumb-color-focus
	 * ```
	 *
	 * @type {"default" | "vscode"}
	 */
	export let theme = 'default';

	///// Collapse behavior ///////////////////////////////////////////

	/**
	 * Will show a collapse bar at the bottom of the component, that can be used to hide and show the output. Default is `false`.
	 * When toggled, the state is saved in session storage for all SuperDebug components on the page.
	 */
	export let collapsible = false;

	/**
	 * Initial state for the collapsed component. Use together with the `collapsible` prop.
	 * On subsequent page loads, the session storage will determine the state of all SuperDebug components on the page.
	 */
	export let collapsed = false;

	if (browser && collapsible) setCollapse();

	/**
	 * @param {boolean|undefined} status
	 */
	function setCollapse(status = undefined) {
		let data;
		// eslint-disable-next-line svelte/valid-compile
		const route = $page.route.id ?? '';

		try {
			if (sessionStorage.SuperDebug) {
				data = JSON.parse(sessionStorage.SuperDebug);
			}

			data = { collapsed: data && data.collapsed ? data.collapsed : {} };

			data.collapsed[route] = status === undefined ? (data.collapsed[route] ?? collapsed) : status;
		} catch {
			data = {
				collapsed: {
					[route]: collapsed
				}
			};
		}

		if (status !== undefined) {
			sessionStorage.SuperDebug = JSON.stringify(data);
		}

		collapsed = data.collapsed[route];
	}

	/**
	 * @type {ReturnType<typeof setTimeout> | undefined}
	 */
	let copied;

	/**
	 * @param {Event} e
	 */
	async function copyContent(e) {
		if (!e.target) return;
		const parent = /** @type {HTMLElement} */ (e.target).closest('.super-debug');
		if (!parent) return;

		const codeEl = /** @type {HTMLPreElement} */ (parent.querySelector('.super-debug--code'));
		if (!codeEl) return;

		clearTimeout(copied);
		await clipboardCopy(codeEl.innerText);
		copied = setTimeout(() => (copied = undefined), 900);
	}

	/**
	 * @param {File} file
	 */
	function fileToJSON(file) {
		return {
			name: file.name,
			size: file.size,
			type: file.type,
			lastModified: new Date(file.lastModified)
		};
	}

	///////////////////////////////////////////////////////////////////

	/**
	 * @param {unknown} json
	 * @returns {string}
	 */
	function syntaxHighlight(json) {
		switch (typeof json) {
			case 'function': {
				return `<span class="function">[function ${json.name ?? 'unnamed'}]</span>`;
			}
			case 'symbol': {
				return `<span class="symbol">${json.toString()}</span>`;
			}
		}

		const encodedString = JSON.stringify(
			json,
			function (key, value) {
				if (value === undefined) {
					return '#}#undefined';
				}
				if (typeof this === 'object' && this[key] instanceof Date) {
					// @ts-expect-error Date checking works with isNaN
					return '#}D#' + (isNaN(this[key]) ? 'Invalid Date' : value);
				}
				if (typeof value === 'number') {
					if (value == Number.POSITIVE_INFINITY) return '#}#Inf';
					if (value == Number.NEGATIVE_INFINITY) return '#}#-Inf';
					if (isNaN(value)) return '#}#NaN';
				}
				if (typeof value === 'bigint') {
					return '#}BI#' + value;
				}
				if (typeof value === 'function' && functions) {
					return '#}F#' + `[function ${value.name}]`;
				}
				if (value instanceof Error) {
					return '#}E#' + `${value.name}: ${value.message || value.cause || '(No error message)'}`;
				}
				if (value instanceof Set) {
					return Array.from(value);
				}
				if (value instanceof Map) {
					return Array.from(value.entries());
				}
				if (browser && typeof this === 'object' && this[key] instanceof File) {
					return fileToJSON(this[key]);
				}
				if (browser && typeof this === 'object' && this[key] instanceof FileList) {
					/** @type FileList */
					const list = this[key];
					const output = [];
					for (let i = 0; i < list.length; i++) {
						const file = list.item(i);
						if (file) output.push(fileToJSON(file));
					}
					return output;
				}
				return value;
			},
			2
		)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		return encodedString.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
			function (match) {
				let cls = 'number';
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = 'key';
						match = match.slice(1, -2) + ':';
					} else {
						cls = 'string';
						match =
							stringTruncate > 0 && match.length > stringTruncate
								? match.slice(0, stringTruncate / 2) +
									`[..${match.length - stringTruncate}/${match.length}..]` +
									match.slice(-stringTruncate / 2)
								: match;

						if (match == '"#}#undefined"') {
							cls = 'undefined';
							match = 'undefined';
						} else if (match.startsWith('"#}D#')) {
							cls = 'date';
							match = match.slice(5, -1);
						} else if (match == '"#}#NaN"') {
							cls = 'nan';
							match = 'NaN';
						} else if (match == '"#}#Inf"') {
							cls = 'nan';
							match = 'Infinity';
						} else if (match == '"#}#-Inf"') {
							cls = 'nan';
							match = '-Infinity';
						} else if (match.startsWith('"#}BI#')) {
							cls = 'bigint';
							match = match.slice(6, -1) + 'n';
						} else if (match.startsWith('"#}F#')) {
							cls = 'function';
							match = match.slice(5, -1);
						} else if (match.startsWith('"#}E#')) {
							cls = 'error';
							match = match.slice(5, -1);
						}
					}
				} else if (/true|false/.test(match)) {
					cls = 'boolean';
				} else if (/null/.test(match)) {
					cls = 'null';
				}
				return '<span class="' + cls + '">' + match + '</span>';
			}
		);
	}

	/**
	 * @param {EncodeableData} data
	 * @param {boolean} raw
	 * @param {boolean} promise
	 * @returns {data is Promise<unknown>}
	 */
	function assertPromise(data, raw, promise) {
		if (raw) {
			return false;
		}
		return (
			promise ||
			(typeof data === 'object' &&
				data !== null &&
				'then' in data &&
				typeof data['then'] === 'function')
		);
	}

	/**
	 * @param {DebugData} data
	 * @param {boolean} raw
	 * @returns {data is EncodeableDataStore}
	 */
	function assertStore(data, raw) {
		if (raw) {
			return false;
		}
		return (
			typeof data === 'object' &&
			data !== null &&
			'subscribe' in data &&
			typeof data['subscribe'] === 'function'
		);
	}

	$: themeStyle =
		theme === 'vscode'
			? `
      --sd-vscode-bg-color: #1f1f1f;
      --sd-vscode-label-color: #cccccc;
      --sd-vscode-code-default: #8c8a89;
      --sd-vscode-code-key: #9cdcfe;
      --sd-vscode-code-string: #ce9171;
      --sd-vscode-code-number: #b5c180;
      --sd-vscode-code-boolean: #4a9cd6;
      --sd-vscode-code-null: #4a9cd6;
      --sd-vscode-code-undefined: #4a9cd6;
      --sd-vscode-code-nan: #4a9cd6;
      --sd-vscode-code-symbol: #4de0c5;
      --sd-vscode-sb-thumb-color: #35373a;
      --sd-vscode-sb-thumb-color-focus: #4b4d50;
    `
			: undefined;

	/** @type {import('svelte/store').Readable<EncodeableData>} */
	$: debugData = assertStore(data, raw) ? data : readable(data);
</script>

{#if !styleInit}
	<style>
		.super-debug--absolute {
			position: absolute;
		}

		.super-debug--top-0 {
			top: 0;
		}

		.super-debug--inset-x-0 {
			left: 0px;
			right: 0px;
		}

		.super-debug--hidden {
			height: 0;
			overflow: hidden;
		}

		.super-debug--hidden:not(.super-debug--with-label) {
			height: 1.5em;
		}

		.super-debug--rotated {
			transform: rotate(180deg);
		}

		.super-debug {
			--_sd-bg-color: var(--sd-bg-color, var(--sd-vscode-bg-color, rgb(30, 41, 59)));
			position: relative;
			background-color: var(--_sd-bg-color);
			border-radius: 0.5rem;
			overflow: hidden;
		}

		.super-debug--pre {
			overflow-x: auto;
		}

		.super-debug--collapse {
			display: block;
			width: 100%;
			color: rgba(255, 255, 255, 0.25);
			background-color: rgba(255, 255, 255, 0.15);
			padding: 5px 0;
			display: flex;
			justify-content: center;
			border-color: transparent;
			margin: 0;
			padding: 3px 0;
		}

		.super-debug--collapse:focus {
			color: #fafafa;
			background-color: rgba(255, 255, 255, 0.25);
		}

		.super-debug--collapse:is(:hover) {
			color: rgba(255, 255, 255, 0.35);
			background-color: rgba(255, 255, 255, 0.25);
		}

		.super-debug--status {
			display: flex;
			padding: 1em;
			padding-bottom: 0;
			justify-content: space-between;
			font-family: Inconsolata, Monaco, Consolas, 'Lucida Console', 'Courier New', Courier,
				monospace;
		}

		.super-debug--right-status {
			display: flex;
			gap: 0.55em;
		}

		.super-debug--copy {
			margin: 0;
			padding: 0;
			padding-top: 2px;
			background-color: transparent;
			border: 0;
			color: #666;
			cursor: pointer;
		}

		.super-debug--copy:hover {
			background-color: transparent;
			color: #666;
		}

		.super-debug--copy:focus {
			background-color: transparent;
			color: #666;
		}

		.super-debug--label {
			color: var(--sd-label-color, var(--sd-vscode-label-color, white));
		}

		.super-debug--promise-loading {
			color: var(--sd-promise-loading-color, var(--sd-vscode-promise-loading-color, #999));
		}

		.super-debug--promise-rejected {
			color: var(--sd-promise-rejected-color, var(--sd-vscode-promise-rejected-color, #ff475d));
		}

		.super-debug pre {
			color: var(--sd-code-default, var(--sd-vscode-code-default, #999));
			background-color: var(--_sd-bg-color);
			font-size: 1em;
			margin-bottom: 0;
			padding: 1em 0 1em 1em;
		}

		.super-debug--info {
			color: var(--sd-info, var(--sd-vscode-info, rgb(85, 85, 255)));
		}

		.super-debug--success {
			color: var(--sd-success, var(--sd-vscode-success, #2cd212));
		}

		.super-debug--redirect {
			color: var(--sd-redirect, var(--sd-vscode-redirect, #03cae5));
		}

		.super-debug--error {
			color: var(--sd-error, var(--sd-vscode-error, #ff475d));
		}

		.super-debug--code .key {
			color: var(--sd-code-key, var(--sd-vscode-code-key, #eab308));
		}

		.super-debug--code .string {
			color: var(--sd-code-string, var(--sd-vscode-code-string, #6ec687));
		}

		.super-debug--code .date {
			color: var(--sd-code-date, var(--sd-vscode-code-date, #f06962));
		}

		.super-debug--code .boolean {
			color: var(--sd-code-boolean, var(--sd-vscode-code-boolean, #79b8ff));
		}

		.super-debug--code .number {
			color: var(--sd-code-number, var(--sd-vscode-code-number, #af77e9));
		}

		.super-debug--code .bigint {
			color: var(--sd-code-bigint, var(--sd-vscode-code-bigint, #af77e9));
		}

		.super-debug--code .null {
			color: var(--sd-code-null, var(--sd-vscode-code-null, #238afe));
		}

		.super-debug--code .nan {
			color: var(--sd-code-nan, var(--sd-vscode-code-nan, #af77e9));
		}

		.super-debug--code .undefined {
			color: var(--sd-code-undefined, var(--sd-vscode-code-undefined, #238afe));
		}

		.super-debug--code .function {
			color: var(--sd-code-function, var(--sd-vscode-code-function, #f06962));
		}

		.super-debug--code .symbol {
			color: var(--sd-code-symbol, var(--sd-vscode-code-symbol, #4de0c5));
		}

		.super-debug--code .error {
			color: var(--sd-code-error, var(--sd-vscode-code-error, #ff475d));
		}

		.super-debug pre::-webkit-scrollbar {
			width: var(--sd-sb-width, var(--sd-vscode-sb-width, 1rem));
			height: var(--sd-sb-height, var(--sd-vscode-sb-height, 1rem));
		}

		.super-debug pre::-webkit-scrollbar-track {
			border-radius: 12px;
			background-color: var(
				--sd-sb-track-color,
				var(--sd-vscode-sb-track-color, hsl(0, 0%, 40%, 0.2))
			);
		}
		.super-debug:is(:focus-within, :hover) pre::-webkit-scrollbar-track {
			border-radius: 12px;
			background-color: var(
				--sd-sb-track-color-focus,
				var(--sd-vscode-sb-track-color-focus, hsl(0, 0%, 50%, 0.2))
			);
		}

		.super-debug pre::-webkit-scrollbar-thumb {
			border-radius: 12px;
			background-color: var(
				--sd-sb-thumb-color,
				var(--sd-vscode-sb-thumb-color, hsl(217, 50%, 50%, 0.5))
			);
		}
		.super-debug:is(:focus-within, :hover) pre::-webkit-scrollbar-thumb {
			border-radius: 12px;
			background-color: var(
				--sd-sb-thumb-color-focus,
				var(--sd-vscode-sb-thumb-color-focus, hsl(217, 50%, 50%))
			);
		}
	</style>
	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{@const init = styleInit = true}
{/if}

<!-- eslint-disable svelte/no-at-html-tags -->
{#if display}
	<div
		class="super-debug"
		class:super-debug--collapsible={collapsible}
		style={themeStyle}
		dir="ltr"
	>
		<div
			class="super-debug--status {label === ''
				? 'super-debug--absolute super-debug--inset-x-0 super-debug--top-0'
				: ''}"
		>
			<div class="super-debug--label">{label}</div>
			<div class="super-debug--right-status">
				<button type="button" class="super-debug--copy" on:click={copyContent}>
					{#if !copied}
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"
							><g
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								><path
									d="M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333z"
								/><path
									d="M4.012 16.737A2.005 2.005 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1"
								/></g
							></svg
						>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"
							><g
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								><path d="M15 12v6m-3-3h6" /><rect
									width="14"
									height="14"
									x="8"
									y="8"
									rx="2"
									ry="2"
								/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></g
							></svg
						>
					{/if}
				</button>
				{#if status}
					<div
						class:super-debug--info={$page.status < 200}
						class:super-debug--success={$page.status >= 200 && $page.status < 300}
						class:super-debug--redirect={$page.status >= 300 && $page.status < 400}
						class:super-debug--error={$page.status >= 400}
					>
						{$page.status}
					</div>
				{/if}
			</div>
		</div>
		<pre
			class="super-debug--pre"
			class:super-debug--with-label={label}
			class:super-debug--hidden={collapsed}
			bind:this={ref}><code class="super-debug--code"
				><slot
					>{#if assertPromise($debugData, raw, promise)}{#await $debugData}<div
								class="super-debug--promise-loading">Loading data...</div>{:then result}{@html syntaxHighlight(
								assertStore(result, raw) ? get(result) : result
							)}{:catch error}<span class="super-debug--promise-rejected">Rejected:</span
							> {@html syntaxHighlight(error)}{/await}{:else}{@html syntaxHighlight(
							$debugData
						)}{/if}</slot
				></code
			></pre>
		{#if collapsible}
			<button
				type="button"
				on:click|preventDefault={() => setCollapse(!collapsed)}
				class="super-debug--collapse"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					class:super-debug--rotated={collapsed}
					><path
						fill="currentColor"
						d="M4.08 11.92L12 4l7.92 7.92l-1.42 1.41l-5.5-5.5V22h-2V7.83l-5.5 5.5l-1.42-1.41M12 4h10V2H2v2h10Z"
					/></svg
				>
			</button>
		{/if}
	</div>
{/if}

<!--
  @component

  SuperDebug is a debugging component that gives you colorized and nicely formatted output for any data structure, usually $form.
  
  Other use cases includes debugging plain objects, promises, stores and more.

  More info: https://superforms.rocks/super-debug
  
  **Short example:**

  ```svelte
  <script>
    import SuperDebug from 'sveltekit-superforms';
    import { superForm } from 'sveltekit-superforms';

    export let data;
    
    const { errors, form, enhance } = superForm(data.form);
  </script>
  
  <SuperDebug data={$form} label="My form data" />
  ```
-->
