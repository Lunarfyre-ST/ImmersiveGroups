# Set up the new repository

The prepared project is **ImmersiveGroups**, not a fork of just one upstream project. Both origins and licenses remain documented in CREDITS.md.

## Updating the existing repository

The project repository is https://github.com/Lunarfyre-ST/ImmersiveGroups. Upload the contents of the extracted ImmersiveGroups folder to that repository, replacing matching files. Update ZIPs deliberately omit the root README.md to preserve your custom README. Keep any preview images already in docs. Create a release/tag after committing the update if you want a checkpoint.

## Initial setup using the GitHub website

1. Create a new repository named **ImmersiveGroups** under your account. Choose the visibility you want. Start with an empty repository: the source includes its license and gitignore. Keep or create your own README; update ZIPs omit it.
2. Extract the ZIP locally. Open its `ImmersiveGroups` folder.
3. On GitHub choose **Add file → Upload files**, and upload the **contents of that folder**. `manifest.json`, `index.js` and the other root files must appear directly at the repository root. Upload the `gallery`, `modules`, `html`, `styles`, `licenses`, `scripts`, `tests`, `docs` and `.github` folders too.
4. Commit the upload. A suitable first message is `Combine scene controls and galleries as ImmersiveGroups`.
5. Add your repository URL to `manifest.json` as `homePage`. Do not put either upstream project's URL there as the combined project's own homepage. Upstream links remain in the credits.
6. The resulting repository URL can be used in SillyTavern's extension installer. Keep the extension folder named `ImmersiveGroups`. Disable the old standalone extensions before reloading.

Automatic updates start disabled. Enable them only when you want this installed checkout to follow the new repository; use the new repository's own git remote. If you previously renamed an existing upstream checkout to ImmersiveGroups, copying files does not change its git remote. Installing/cloning the new repository into a fresh ImmersiveGroups folder avoids that ambiguity.

Do not upload `.git` through Add file. It is local git metadata, not project source. Do not upload node_modules, screenshots/test artifacts, API keys, account settings, chat data or image libraries. None of those are part of this ZIP.

## Using git instead

From inside the extracted ImmersiveGroups folder, substitute your real account and URL:

```sh
git init -b main
git add .
git commit -m "Combine scene controls and galleries as ImmersiveGroups"
git remote add origin https://github.com/YOUR_ACCOUNT/ImmersiveGroups.git
git push -u origin main
```

Keep source changes and regenerated `gallery/dist/gallery.js` / `.LEGAL.txt` together. The CI workflow runs npm's locked install, build, checks and unit tests. Browser integration can be run locally using the README instructions.
