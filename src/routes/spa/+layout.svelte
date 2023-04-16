<script>
  export const ssr = false;
</script>

<nav>
  <a href="/spa/zod">Zod schema</a> |
  <a href="/spa/zod-page-ts">Zod with +page.ts</a> |
  <a href="/spa/without-zod">Without Zod</a>
</nav>

<h2>Superforms SPA</h2>

<slot />

<style lang="scss">
  nav {
    text-align: center;
    margin-bottom: 12px;
  }
</style>
