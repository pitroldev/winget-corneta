# Corneta WinGet distribution

This repository prepares the `pitroldev.Corneta` manifest for the community
repository `microsoft/winget-pkgs`. It reuses the official stable installer;
it never rebuilds Corneta.

The six-hour workflow verifies the upstream release, checksums and updater
signature using a pinned Corneta verifier. It generates schema 1.12 manifests
and checks silent installation, installed metadata, removal and synthetic-data
preservation on a disposable Windows runner without launching Corneta.

Manual runs default to validation only. A publication run creates a pull request
from `pitroldev/winget-pkgs`; Microsoft review remains separate from submission.
Existing upstream versions and open pull requests are skipped. Rejected or closed
submissions are not silently reopened. No forced branch updates are performed.

Publishing requires `WINGET_GITHUB_TOKEN` in this repository's Actions secrets.
Use a dedicated GitHub credential with the public repository permissions needed
to write the fork and open a pull request in `microsoft/winget-pkgs`. Do not copy
an unrelated broad credential. Never put the token in files, command arguments
or logs. Without it the workflow still validates and reports that publication
is waiting for credential setup; this does not mean the package was submitted.

The initial package may require signing Microsoft's contributor license agreement.
Publication cannot bypass that agreement or Microsoft moderation.

The initial submission is [microsoft/winget-pkgs#468450](https://github.com/microsoft/winget-pkgs/pull/468450).
After Microsoft accepts it and refreshes the catalog, install with:

```powershell
winget install --id pitroldev.Corneta --exact --source winget
```

The dedicated `corneta-winget-ci` token is configured with `public_repo` scope and
expires on January 31, 2027. Rotate it before that date and replace the repository
secret through standard input or GitHub's encrypted secret settings. This classic
scope covers public repositories accessible to the account, not only this project.
Repository workflows never require access to private repositories.
