# Obsidian Community Plugin Submission Guide

Follow this checklist when submitting Mathz to the official Obsidian Community Plugins directory:

## Pre-Submission Checklist

- [ ] **Plugin ID Uniqueness**: Confirm `id` (`mathz`) is not already used by searching `community-plugins.json` in the `obsidianmd/obsidian-releases` repository.
- [ ] **Repository Status**: Push all commits to your GitHub repository on `main` branch.
- [ ] **Version Sync**: Run `npm version <x.y.z>` flow to update `package.json`, `manifest.json`, and `versions.json`.
- [ ] **Release Tag**: Create a release tag matching the manifest version **exactly** (e.g. `1.0.0`, no leading "v").
- [ ] **Release Assets**: Attach `main.js`, `manifest.json`, and `styles.css` as release assets (the `.github/workflows/release.yml` workflow does this automatically).
- [ ] **Policy Verification**: Review Obsidian's "Developer policies" and "Submission requirements for plugins" guidelines.

## Submission Pull Request Template

Submit a pull request to [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) adding your plugin entry at the **END** of `community-plugins.json`:

```json
  {
    "id": "mathz",
    "name": "Mathz",
    "author": "Md Mahadi Hassan",
    "description": "Plot equations, curves and inequalities with interactive sliders from mathz code blocks.",
    "repo": "ldTaohid880/mathz"
  }
```
