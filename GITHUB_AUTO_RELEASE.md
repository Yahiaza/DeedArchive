# GitHub automatic releases

The repository uses `.github/workflows/release.yml`.

When a tag such as `v0.2.7` is pushed, GitHub Actions builds the Windows Portable executable and creates a GitHub Release automatically.

## Normal future publishing

Automatic patch bump:

```powershell
npm run github:publish
```

Or choose the version yourself:

```powershell
npm run github:publish -- 0.2.7
```

No local GitHub CLI (`gh`) is required.
