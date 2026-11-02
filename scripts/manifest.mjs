import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const [releaseDirectory, outputDirectory] = process.argv.slice(2);
if (!releaseDirectory || !outputDirectory) throw new Error('Usage: node scripts/manifest.mjs RELEASE_DIRECTORY OUTPUT_DIRECTORY');
const release = JSON.parse(readFileSync(join(releaseDirectory, 'release.json'), 'utf8'));
const { version, sha256, installer, tag } = release;
if (!/^\d+\.\d+\.\d+$/.test(version) || tag !== `v${version}` || installer !== `Corneta_${version}_x64-setup.exe` || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid verified release identity.');
const hash = createHash('sha256').update(readFileSync(join(releaseDirectory, installer))).digest('hex');
if (hash !== sha256) throw new Error('The installer changed after verification.');
const id = 'pitroldev.Corneta';
const directory = resolve(outputDirectory, 'manifests/p/pitroldev/Corneta', version);
mkdirSync(directory, { recursive: true });
function save(suffix, type, text) {
  const schema = type === 'defaultLocale' ? 'defaultLocale' : type;
  writeFileSync(join(directory, `${id}${suffix}.yaml`), `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${schema}.1.12.0.schema.json\n\nPackageIdentifier: ${id}\nPackageVersion: ${version}\n${text}\nManifestType: ${type}\nManifestVersion: 1.12.0\n`);
}
save('', 'version', 'DefaultLocale: en-US');
save('.locale.en-US', 'defaultLocale', `PackageLocale: en-US
Publisher: Pitrol
PublisherUrl: https://github.com/pitroldev
PublisherSupportUrl: https://github.com/pitroldev/corneta/issues
Author: Petro Cardoso (pitroldev)
PackageName: Corneta
PackageUrl: https://www.corneta.live
License: MIT
LicenseUrl: https://github.com/pitroldev/corneta/blob/${tag}/LICENSE
ShortDescription: Free, open-source multistreaming companion for OBS.
Description: |-
  Corneta is a Windows desktop companion for OBS and other RTMP encoders.
  Stream to Twitch, YouTube, Kick and custom RTMP/RTMPS destinations,
  adjust quality per destination, follow supported platform chats,
  and optionally record with synchronized chat replay.
  No Corneta account or subscription is required. Your computer processes
  and uploads the stream; bandwidth and hardware requirements depend on
  the selected mode and destinations.
Moniker: corneta
Tags:
  - broadcasting
  - livestreaming
  - multistream
  - obs
  - rtmp
  - streaming
  - twitch
  - youtube
ReleaseNotesUrl: https://github.com/pitroldev/corneta/releases/tag/${tag}`);
save('.installer', 'installer', `InstallerType: nullsoft
Scope: user
InstallModes:
  - interactive
  - silent
InstallerSwitches:
  Silent: /S
  SilentWithProgress: /S
UpgradeBehavior: install
Dependencies:
  PackageDependencies:
    - PackageIdentifier: Microsoft.EdgeWebView2Runtime
ProductCode: Corneta
AppsAndFeaturesEntries:
  - DisplayName: Corneta
    Publisher: Pitrol
    DisplayVersion: ${version}
    ProductCode: Corneta
Installers:
  - Architecture: x64
    InstallerUrl: https://github.com/pitroldev/corneta/releases/download/${tag}/${installer}
    InstallerSha256: ${sha256.toUpperCase()}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ndirectory=${directory}\n`);
console.log(directory);
