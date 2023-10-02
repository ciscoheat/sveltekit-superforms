<nav>
  <a href="/">Start</a>
  <a href="/test">Test page</a>
  <a href="/crud">CRUD</a>
  <a href="/super-debug">SuperDebug</a>
  <a href="/nested">Nested</a>
  <a href="/timers">Timers</a>
  <a href="/multiple">Multiple</a>
  <a href="/multiple2">Multiple 2</a>
  <a href="/snapshot">Snapshot</a>
  <a href="/dates">Dates</a>
  <a href="/reset">Reset</a>
  <a href="/url">URL</a>
  <a href="/tainted">Tainted</a>
  <a href="/proxies">Proxies</a>
  <a href="/tests/datetime-local">Proxies 2</a>
  <a href="/properly-nested">Properly nested</a>
  <a href="/nested-validation">Nested client validation</a>
  <a href="/tests/rex">Side-effect validation</a>
  <a href="/tests/superform-c">Side-effect 2</a>
  <a href="/tests/custom-validity">Custom validity</a>
  <a href="/files">Files</a>
  <a href="/spa">SPA</a>
  <a href="/tests/multiselect">Multi-select</a>
  <a href="/tests/spa-values-disappearing">SPA onUpdate</a>
  <a href="/posted">Posted store</a>
  <a href="/tests/flash-onerror">Flash onError</a>
  <a href="/tests/reset-component">Reset component 1</a>
  <a href="/tests/reset-component-2">Reset component 2</a>
  <a href="/tests/tainted-proxy">Tainted formFieldProxy</a>
</nav>

<style lang="scss">
  nav {
    display: flex;
    text-align: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    column-gap: 5px;
    justify-content: center;

    a {
      white-space: nowrap;
      &:not(:last-child)::after {
        content: ' | ';
      }
    }
  }
</style>
