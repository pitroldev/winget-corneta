import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const [directory, version] = process.argv.slice(2);
if (!directory || !/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Usage: node scripts/submit.mjs MANIFEST_DIRECTORY VERSION');
const upstream = 'microsoft/winget-pkgs';
const fork = 'pitroldev/winget-pkgs';
const branch = `codex/corneta-${version}`;
const prefix = `manifests/p/pitroldev/Corneta/${version}`;
const expected = ['pitroldev.Corneta.installer.yaml', 'pitroldev.Corneta.locale.en-US.yaml', 'pitroldev.Corneta.yaml'];
if (JSON.stringify(readdirSync(directory).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected manifest files.');
function api(path, body) {
  return JSON.parse(execFileSync('gh', ['api', path, ...(body ? ['--method', 'POST', '--input', '-'] : [])], { input: body ? JSON.stringify(body) : undefined, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }));
}
function optional(path) {
  try { return api(path); } catch (error) {
    if (String(error.stderr).includes('(HTTP 404)')) return null;
    throw error;
  }
}
function report(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}
if (optional(`repos/${upstream}/contents/${prefix}`)) {
  report(`Version ${version} is already present upstream.`);
  process.exit(0);
}
const prs = api(`repos/${upstream}/pulls?state=all&head=pitroldev:${branch}`);
if (prs.length) {
  const pr = prs[0];
  report(`Existing submission (${pr.state}): ${pr.html_url}`);
  if (pr.state === 'closed' && !pr.merged_at) throw new Error('The previous submission was closed without merging; maintainer review is required.');
  process.exit(0);
}
const duplicates = api(`search/issues?q=${encodeURIComponent(`repo:${upstream} is:pr is:open "pitroldev.Corneta" "${version}"`)}`);
if (duplicates.total_count) {
  report(`Another submission already exists: ${duplicates.items[0].html_url}`);
  process.exit(0);
}
const parent = api(`repos/${upstream}/git/ref/heads/master`).object.sha;
const commit = api(`repos/${upstream}/git/commits/${parent}`);
const tree = api(`repos/${fork}/git/trees`, {
  base_tree: commit.tree.sha,
  tree: expected.map(name => ({ path: `${prefix}/${name}`, mode: '100644', type: 'blob', content: readFileSync(join(directory, name), 'utf8') })),
});
let existing = optional(`repos/${fork}/git/ref/heads/${branch}`);
if (existing) {
  const previous = api(`repos/${fork}/git/commits/${existing.object.sha}`);
  if (previous.tree.sha !== tree.sha) throw new Error('An existing submission branch differs; refusing to overwrite it.');
} else {
  const created = api(`repos/${fork}/git/commits`, { message: `New package: pitroldev.Corneta version ${version}`, tree: tree.sha, parents: [parent] });
  existing = api(`repos/${fork}/git/refs`, { ref: `refs/heads/${branch}`, sha: created.sha });
}
const pr = api(`repos/${upstream}/pulls`, {
  title: `New package: pitroldev.Corneta version ${version}`,
  head: `pitroldev:${branch}`,
  base: 'master',
  body: `## Description\n\nAdd Corneta ${version}, a free, open-source multistreaming companion for OBS on Windows. Uses the official x64 per-user NSIS installer, with the publisher and uninstall key checked on a disposable Windows runner.\n\nThe release assets, SHA-256 checksums and updater signature were verified before generating these manifests.\n\n## Checklist\n\n- [ ] Signed the Microsoft Contributor License Agreement (pending CLA bot confirmation)\n- Issue: not applicable to this new package submission\n- [x] Checked for duplicate open pull requests\n- [x] Only one package version is included\n- [x] Validated with winget validate\n- [x] Silent installer installation, installed metadata and removal tested on a disposable Windows runner\n- [x] Manifest conforms to schema 1.12\n\nValidation workflow: https://github.com/pitroldev/winget-corneta/actions\n`,
});
report(`Submitted for Microsoft review: ${pr.html_url}`);
