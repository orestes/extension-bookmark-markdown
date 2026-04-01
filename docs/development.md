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
