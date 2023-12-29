<nav class="flex-list">
	<ul>
		<li><a href="/">Start</a></li>
		<li><a href="/v2">v2</a></li>
		<li><a href="/test">Test page</a></li>
		<li><a href="/crud">CRUD</a></li>
		<li><a href="/super-debug">SuperDebug</a></li>
		<li><a href="/nested">Nested</a></li>
		<li><a href="/timers">Timers</a></li>
		<li><a href="/multiple">Multiple</a></li>
		<li><a href="/multiple2">Multiple 2</a></li>
		<li><a href="/snapshot">Snapshot</a></li>
		<li><a href="/dates">Dates</a></li>
		<li><a href="/reset">Reset</a></li>
		<li><a href="/url">URL</a></li>
		<li><a href="/tainted">Tainted</a></li>
		<li><a href="/proxies">Proxies</a></li>
		<li><a href="/tests/datetime-local">Proxies 2</a></li>
		<li><a href="/properly-nested">Properly nested</a></li>
		<li><a href="/nested-validation">Nested client validation</a></li>
		<li><a href="/tests/rex">Side-effect validation</a></li>
		<li><a href="/tests/superform-c">Side-effect 2</a></li>
		<li><a href="/tests/custom-validity">Custom validity</a></li>
		<li><a href="/files">Files</a></li>
		<li><a href="/spa">SPA</a></li>
		<li><a href="/tests/multiselect">Multi-select</a></li>
		<li><a href="/tests/spa-values-disappearing">SPA onUpdate</a></li>
		<li><a href="/posted">Posted store</a></li>
		<li><a href="/tests/flash-onerror">Flash onError</a></li>
		<li><a href="/tests/reset-component">Reset component 1</a></li>
		<li><a href="/tests/reset-component-2">Reset component 2</a></li>
		<li><a href="/tests/tainted-proxy">Tainted formFieldProxy</a></li>
		<li>
			<a href="/tests/spa-schema-transform?SPA">SPA schema transform</a>
		</li>
		<li><a href="/tests/array-component">Array proxy</a></li>
		<li><a href="/tests/redirect-same-route">Redirect with delay</a></li>
	</ul>
</nav>

<style lang="scss">
	.flex-list {
		position: relative;
		overflow: hidden;
	}
	.flex-list ul {
		padding: 0;
		list-style-type: none;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-left: -1px;
	}
	.flex-list li {
		flex-grow: 1;
		flex-basis: auto;
		margin: 0;
		padding: 0 0.2em;
		text-align: center;
		border-left: 1px solid #bbb;
	}
</style>
