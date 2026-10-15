# Development

## Setup

```bash
yarn install
yarn hooks:install
```

`yarn hooks:install` sets up the git pre-commit hook via [Husky](https://typicode.github.io/husky/). This is a one-time step per clone and is not run automatically.

## Pre-commit hook

The hook runs `yarn build` (TypeScript type-check + bundle) and `yarn format` (Prettier) before every commit, and stages any files changed by formatting automatically.

## Building

```bash
yarn build
```

Type-checks with `tsc` and bundles with esbuild. Output goes to `dist/`.

## Formatting

Formatting runs automatically on staged files via lint-staged as part of the pre-commit hook.

To format all files at once, stage everything and let the hook handle it:

```bash
git add -u
git commit
```

`yarn format:check` is available for CI verification only.

## Releasing

Releases are fully automated via [semantic-release](https://semantic-release.gitbook.io/) on every push to `main`. Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) — the release type (patch/minor/major) is determined automatically from the commit history.

### Chrome Web Store upload

The release's last step uploads the zip and submits it for review with `npx chrome-webstore-upload-cli@4` (`.releaserc.json`), which talks to the Chrome Web Store API v2. It runs in the `Chrome Web Store` GitHub environment and reads these from the Release step's env:

| Name            | Stored as | What it is                                                                                     |
| --------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `EXTENSION_ID`  | variable  | The store item's ID, also in the listing URL                                                   |
| `PUBLISHER_ID`  | variable  | The developer account's publisher ID, from the Chrome Web Store Developer Dashboard's Settings |
| `CLIENT_ID`     | secret    | OAuth2 client ID                                                                               |
| `CLIENT_SECRET` | secret    | OAuth2 client secret                                                                           |
| `REFRESH_TOKEN` | secret    | OAuth2 refresh token                                                                           |

v4 takes the three OAuth2 values from the environment only; it removed their CLI flags ([v4.0.0 release notes](https://github.com/fregante/chrome-webstore-upload-cli/releases/tag/v4.0.0), read 2026-10-15, not run). [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys) describes how to create the OAuth2 values.

The Release step exits with an error before semantic-release runs when `PUBLISHER_ID` is empty. Without that check the upload would be the step that fails, after the GitHub release and the `chore(release)` commit already exist.
