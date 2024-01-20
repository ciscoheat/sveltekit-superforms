<nav class="flex-list">
	<ul>
		<li><a href="/">v1</a></li>
		<li><a href="/v2">v2</a></li>
		<li><a href="/v2/validate">Validate</a></li>
		<li><a href="/v2/discord/array-remove">Array-remove</a></li>
		<li><a href="/v2/allow-files">Allow files</a></li>
		<li><a href="/v2/multiple-files">Multiple files</a></li>
		<li><a href="/v2/nested-files">Nested files</a></li>
		<li><a href="/v2/unions">Unions</a></li>
		<li><a href="/v2/nested-validation-valibot">Nested validation-Valibot</a></li>
		<li><a href="/v2/catchall">z.catchAll</a></li>
		<li><a href="/v2/submit-enter">Submit on enter</a></li>
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
