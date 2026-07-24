# Release Process

This document describes how a new version of `homebridge-fibaro-home-center` is released to npm.

The whole process is driven by **GitHub Releases**. There is no `release` script in `package.json` and
no manual `npm publish` step: creating and publishing a GitHub Release is the only action a maintainer
performs. Everything else is automated by
[`.github/workflows/autopublish.yml`](../.github/workflows/autopublish.yml).

---

## 1. Overview

```
maintainer publishes a GitHub Release
                │
                ▼
   autopublish.yml is triggered  (on: release → published)
                │
                ├─ npm version <release tag>     → bumps package.json / package-lock.json,
                │                                  creates commit "x.y.z" and tag "vx.y.z"
                ├─ npm ci && npm run build
                ├─ npm publish --tag latest      (stable release)
                │  npm publish --tag beta        (pre-release)
                └─ git push origin HEAD:main && git push --tags
```

The npm dist-tag (`latest` vs `beta`) is decided by the **pre-release checkbox** of the GitHub Release,
and the published version number is taken **verbatim from the Git tag** of the Release.

---

## 2. Prerequisites

### Repository secrets

| Secret | Used for |
| --- | --- |
| `NPM_TOKEN` | Authentication against the npm registry (`npm publish`). Must be an automation token with publish rights on `homebridge-fibaro-home-center`. |
| `GH_TOKEN_FOR_PUSH` | Checkout token used so that the workflow can push the version bump commit and tags back to `main`. The default `GITHUB_TOKEN` is not enough when branch protection or push-back is involved. |

### Branch state

* Everything that should ship must already be merged into `main`.
* Every pull request has already been validated by
  [`lint-compile.yml`](../.github/workflows/lint-compile.yml), which runs `npm ci`, `npm run lint`
  and `npm run build` on Node 20.
* The working tree of `main` must contain the version of the **previous** release in `package.json`.
  Do **not** bump the version manually — the workflow does it.

---

## 3. Version and tag naming rules

The Git tag of the GitHub Release **is** the version that gets published. It must be written
**without a leading `v`**.

| Release type | Tag format | Examples |
| --- | --- | --- |
| Stable | `x.y.z` | `3.2.3`, `3.3.0`, `4.0.0` |
| Beta | `x.y.z-beta.N` | `3.2.3-beta.0`, `3.2.3-beta.1` |

Rules to respect:

* **No `v` prefix.** The tag is passed straight to `npm version`, so `v3.2.3` would produce the
  invalid version `v3.2.3`.
* **Dot between `beta` and the number.** `3.2.3-beta.0` is valid, `3.2.3-beta0` is not.
* **The new version must be strictly greater than the one currently in `package.json`.**
  Re-using the current version makes `npm version` fail with *"Version not changed"*.
* **A stable release following a beta must be equal to or greater than the beta base version.**
  If the last beta was `3.2.3-beta.7`, the stable release is `3.2.3` (or higher).

### Why there are two tag series in the repository

After a release you will see both `3.2.2` and `v3.2.2` in `git tag`:

* `3.2.2` — the tag attached to the GitHub Release, created by the maintainer.
* `v3.2.2` — the tag created inside the workflow by `npm version`, which prefixes tags with `v` by
  default, and pushed back by the final `git push --tags`.

This is expected and harmless.

---

## 4. Step-by-step: publishing a release

1. **Merge everything into `main`** and make sure the branch is green.
2. Go to **GitHub → Releases → _Draft a new release_**.
3. **Choose a tag**: click *Choose a tag*, type the new version (e.g. `3.2.3`) and select
   *Create new tag on publish*. Leave the target as `main`.
4. **Title and notes**: use the version as the title and describe the changes. *Generate release notes*
   gives a good starting point from the merged pull requests.
5. **Pick the channel**:
   * Stable → tick **Set as the latest release**.
   * Beta → tick **Set as a pre-release**.
6. Click **Publish release**. A draft does *not* start the workflow; converting an existing draft into a
   published release does.
7. Watch the **Actions** tab: the *Create latest / beta release* workflow should run and finish green.
8. **Pull locally** once the workflow is done:

   ```sh
   git checkout main
   git pull --tags
   ```

   This brings in the version bump commit created by the bot (`package.json` + `package-lock.json`).

---

## 5. What the workflow does, step by step

Source: [`.github/workflows/autopublish.yml`](../.github/workflows/autopublish.yml)

| # | Step | Detail |
| --- | --- | --- |
| 1 | **Summary** | Echoes the version being released (`github.event.release.tag_name`). |
| 2 | **Check out repository** | `actions/checkout@v4` with `secrets.GH_TOKEN_FOR_PUSH`, so the later push back to `main` is authenticated. Checks out the commit the Release tag points at. |
| 3 | **Set up Node** | Node `20.x`, registry `https://registry.npmjs.org`. |
| 4 | **Git configuration** | Commits are authored as `GitHub Actions <83647248+github-actions[bot]@users.noreply.github.com>`. |
| 5 | **Upgrade version** | `npm version <tag>` — rewrites `package.json` and `package-lock.json`, creates the commit named after the version and the annotated tag `v<version>`. |
| 6 | **Install dependencies and build** | `npm ci && npm run build` (`rimraf ./dist && tsc`). |
| 7 | **Publish LATEST** | Runs only when `!github.event.release.prerelease` → `npm publish --tag latest`. |
| 8 | **Publish BETA** | Runs only when `github.event.release.prerelease` → `npm publish --tag beta`. |
| 9 | **Push changes** | `git push origin HEAD:main && git push --tags`. |

Note that `npm publish` triggers the `prepublishOnly` hook from `package.json`, which runs
`npm run lint && npm run build` a second time. A lint failure at this point aborts the publish.

---

## 6. Installing a beta

Beta versions are published under the `beta` dist-tag, so they are never installed by users running a
plain `npm install`. To test one:

```sh
npm install -g homebridge-fibaro-home-center@beta
# or a specific build
npm install -g homebridge-fibaro-home-center@3.2.3-beta.1
```

Back to stable:

```sh
npm install -g homebridge-fibaro-home-center@latest
```

---

## 7. Pitfalls and troubleshooting

### `npm version` fails with "Version not changed"

The tag of the Release is equal to (or lower than) the version already in `package.json` on `main`.
Delete the GitHub Release **and** its tag, then re-create it with a higher version.

### The published version has a stray `v` in it

The Release tag was written as `v3.2.3` instead of `3.2.3`. `npm version` accepts it, but the published
version string is wrong. Unpublish/deprecate on npm and release again with a correct tag.

### The final push fails ("non fast-forward")

The workflow checks out the commit the Release tag points at and then pushes `HEAD` to `main`. If someone
merges into `main` between the moment the tag is created and the moment the job reaches the push step,
the push is rejected.

Important consequence: **the package has already been published to npm at that point.** Only the version
bump commit is lost. Recover it manually:

```sh
git checkout main
git pull
npm version <the released version> --no-git-tag-version   # sync package.json / package-lock.json
git commit -am "<the released version>"
git push
```

To avoid this, do not merge pull requests while a release workflow is running.

### The workflow did not start at all

* The Release is still a **draft** — drafts never trigger it.
* The Release was *edited* rather than published; only the `published` event type is handled.

### The publish step failed with an auth error

`NPM_TOKEN` is missing, expired, or lacks publish rights. Regenerate an automation token on npm and
update the repository secret; then re-run the failed job from the Actions tab (the version bump commit
may already exist, so check whether `npm version` needs to be skipped).

---

## 8. Related workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [`lint-compile.yml`](../.github/workflows/lint-compile.yml) | `pull_request` | Runs `npm run lint` and `npm run build` — the pre-merge gate. |
| [`recreate-package-lock.yml`](../.github/workflows/recreate-package-lock.yml) | `workflow_dispatch` | Deletes and regenerates `package-lock.json`, commits it to `main`. Useful before a release when dependency updates left the lock file inconsistent. |
| [`install-uninstall-dependency.yml`](../.github/workflows/install-uninstall-dependency.yml) | `workflow_dispatch` | Adds or removes a dependency and commits the result. |
| [`stale.yml`](../.github/workflows/stale.yml) | schedule | Housekeeping for stale issues; unrelated to releases. |
