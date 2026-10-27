# Maintaining SvelteKit 2 and 3 support

**One release, two test environments:** publish Superforms **3.x from `main`**.
That same package supports SvelteKit 2 and 3. `v3/sveltekit-2` is a compatibility
test branch, not another package or release line. Superforms 2.x remains on `v2`
and is outside this process.

## What belongs on each branch

| Branch           | Purpose                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------- |
| `main`           | Shared library code, release versions, documentation, CI, Kit 3 development environment |
| `v3/sveltekit-2` | Main plus the smallest possible Kit 2 development/test tooling patch                    |

Make fixes on main first. Rebase the compatibility patch onto main; do not merge
the compatibility branch back into main or bump/publish its version separately.

The original compatibility patch includes type-only accommodations in
`superForm.ts`, test mocks, demo components, hooks, and tsconfig, plus Kit 2
dependencies and their lockfile. Type-only differences do not change the emitted
JavaScript, but any actual library behavior fix must be shared on main.

## One-time setup

1. Commit and push the maintenance files on main using your normal review process.
   The workflows are inactive until they are on GitHub.
2. Refresh the compatibility branch against that new main commit using the steps
   below. The first rebase can conflict in `package.json`: retain main's hardened
   `compat:*`/validation scripts and new adapter exports, remove the old duplicate
   `compat:rebase`/`compat:sveltekit2` definitions, and retain the Kit 2 development
   dependencies. Resolve the lockfile from that reviewed manifest.
3. Format compatibility-only declarations if lint reports missing final newlines:
   `pnpm exec prettier --write src/lib/client/SuperDebug.svelte.d.ts "src/routes/(v1)/Navigation.d.svelte.ts"`.
   Review and commit these preparation changes; they must not remain uncommitted.
4. In repository Settings, ensure Actions can run. Permit the synchronization
   workflow's `contents: write` token to update and force-push **only**
   `v3/sveltekit-2` under your branch/ruleset policy. Keep main protected; do not
   disable protection globally to make this work.
5. Dispatch the first synchronization from main:

   ```powershell
   gh workflow run compat-sync.yml --ref main -f target=main
   gh run list --workflow compat-sync.yml --limit 5
   gh run watch RUN_ID --exit-status
   ```

6. After a successful CI run, select `verify / gate` (as displayed by GitHub) as
   the required branch-protection check. No registry publishing token or PAT is
   needed for these workflows.

If GitHub's branch policy rejects the compatibility update, the Action fails;
adjust the narrowly scoped policy or update the branch manually. It does not
bypass protection.

## Daily checks

Use Node 24 and the `packageManager` pnpm version pinned in `package.json`.

```powershell
pnpm install --frozen-lockfile
pnpm validate
```

`validate` runs maintenance-script tests, library tests, type checking, lint,
packaging/publint, and adapter export/declaration checks. It does not build the
Vercel demo deployment.

CI checks the exact main/PR candidate in two checkouts: Kit 3 and the Kit 2 patch
rebased onto that candidate. It also packs **main's package once** and exercises
that identical tarball in three isolated, locked consumers:

- Kit 2.12.0, the declared minimum, with its older compatible Vite/plugin.
- Kit 2.70.3 with the current Kit 2 tooling.
- Kit 3.0.0 with Kit 3 tooling.

Consumers check public entry points, barrel/direct adapter imports, both debug
components, form/action/transport types, a production build, SSR, and successful
and failed HTTP form submissions. The tarball is extracted unchanged and linked
locally; its runtime and optional dependencies are installed from the consumer
lockfile, without resolving repository source aliases. CI records actual Kit
versions and the tarball SHA256.

These are pinned coverage points, not proof of every intermediate version.
Update consumer manifests and regenerate their lockfiles deliberately when
upgrading the toolchain. The runner reports any runtime/optional dependency
range that no longer matches the packed package. Never raise a peer minimum
just to make CI green without making an explicit support-policy decision.

For a local tarball check (PowerShell):

```powershell
$archive = Join-Path $env:TEMP 'superforms-candidate.tgz'
pnpm pack --out $archive
pnpm compat:consumer kit2-min $archive
pnpm compat:consumer kit2 $archive
pnpm compat:consumer kit3 $archive
Remove-Item -LiteralPath $archive
```

The consumers create and clean up their own temporary directories and servers.
They require `tar` on PATH (available on GitHub's Ubuntu runners and modern
Windows). To regenerate a fixture lockfile, copy its manifest, the common
`pnpm-workspace.yaml`, and the extracted candidate package into a separate
temporary directory, run `pnpm install --lockfile-only --no-frozen-lockfile`
there, and copy back only its reviewed `pnpm-lock.yaml`.

## Manually refreshing the compatibility branch

Start with a clean checkout, including untracked files:

```powershell
git fetch origin
git switch v3/sveltekit-2
git pull --ff-only origin v3/sveltekit-2
$previous = git rev-parse origin/v3/sveltekit-2
pnpm compat:rebase
```

If the branch does not exist locally, use
`git switch --track origin/v3/sveltekit-2` instead. If a previous automated
rebase makes `git pull --ff-only` fail, stop and inspect your local-only work.
Do not reset or discard it automatically.

`compat:rebase` requires the compatibility branch, a clean tree, and no active
rebase/merge/cherry-pick. It fetches main, captures its SHA, and replays only the
compatibility commits. An optional full commit SHA can select an exact candidate:
`pnpm compat:rebase FULL_COMMIT_SHA`. It never stashes, switches branches, commits,
or pushes for you.

On conflict, inspect `git status`, resolve the named files, stage them, and run
`git rebase --continue`. Use `git rebase --abort` to restore the pre-rebase state.
Do not use blanket ours/theirs resolutions.

If dependency changes require lockfile preparation:

```powershell
pnpm compat:lockfile
git diff -- pnpm-lock.yaml
```

Review and commit only the intended preparation changes, then validate:

```powershell
pnpm compat:sveltekit2
git push "--force-with-lease=refs/heads/v3/sveltekit-2:$previous" origin HEAD:refs/heads/v3/sveltekit-2
```

The normal compatibility check uses a **frozen** install. If the lease fails,
someone else updated the branch: fetch, inspect, and rerun. Never replace the
lease with unconditional force. Switch back to main when finished.

## Releasing Superforms 3.x

1. On clean, current main, update the changelog and select the new Superforms 3.x
   version using your normal `pnpm version` procedure. The existing
   `pnpm next:bump` is for prereleases. Review the resulting release commit/tag;
   the tag must equal `v` plus `package.json`'s version.
2. Push that main commit and its tag, for example:

   ```powershell
   git push origin main
   git push origin v3.0.1
   ```

3. **Before publishing**, wait for `Release compatibility` to succeed for that
   exact tag. It validates both checkouts and all three main-built consumers,
   then updates only `v3/sveltekit-2` with an explicit force-with-lease.
   Conflicts, failed checks, stale targets, or concurrent updates leave the remote
   compatibility branch unchanged.
4. Publish once from the clean validated release commit:
   `pnpm publish` for stable releases, or `pnpm next:pub` for the `next` dist-tag.
   If main has advanced, explicitly check out the release tag first. Never publish
   from the compatibility branch or bypass the prepublish checks.
5. Confirm the registry version and dist-tag:

   ```powershell
   pnpm view sveltekit-superforms@3.0.1 version
   pnpm view sveltekit-superforms dist-tags --json
   ```

The Action triggers on pushed `v3.*` tags, including prereleases; it does not
depend on creating a GitHub Release and never publishes to the registry.
Publishing remains a maintainer-enforced gate: pushing a tag does not prevent
someone from manually publishing too early.

For a retry or pre-release check:

```powershell
gh workflow run compat-sync.yml --ref main -f target=v3.0.1
gh run list --workflow compat-sync.yml --limit 5
gh run view RUN_ID --log-failed
```

Manual dispatch must run the workflow from main, and the target must belong to
main. Old tags predating the maintenance tooling are not valid automation
targets. A target older than the branch's existing main base is rejected rather
than rolling compatibility backward. If publication fails after a successful
sync, fix/retry publication of the same version; do not publish another
Kit-specific variant.

Synchronization runs are serialized and recheck the branch lease immediately
before pushing. All checks execute in the same workflow: a push made with
`GITHUB_TOKEN` does not trigger a new push CI run. The first hosted run and
repository-policy setup must be verified on GitHub, not inferred from local
workflow validation.
