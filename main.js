const { join } = require('node:path');
const { readFileSync } = require('node:fs');

const lockfile = join(process.env.GITHUB_WORKSPACE, 'package-lock.json');
const matcher = /.+\/(?<repo>[\w-]+\/[\w-]+)\.git#(?<hash>[0-9a-f]+)/;

function getBody() {
  const { packages } = JSON.parse(readFileSync(lockfile, 'utf8'));
  return Object.entries(packages).slice(1).map(([key, value]) => {
    if (value.resolved.startsWith('git')) {
      const match = matcher.exec(value.resolved)
      if (match) {
        const { repo, hash } = match.groups;
        return `- [${repo}@\`${hash}\`](https://github.com/${repo}/commit/${hash})`;
      } else {
        console.log(`::warning file=${lockfile},title="Regex failure"::Could not parse ${value.resolved}.
Consider reporting this to https://github.com/tree-sitter/parser-update-action/`)
        return `- \`${value.resolved}\``;
      }
    }
    const name = key.substring(13), version = value.version;
    return `- [${name}@\`${version}\`](https://www.npmjs.com/package/${name}/v/${version})`;
  }).join('\n');
}

/** @param {import('@types/github-script').AsyncFunctionArguments} */
module.exports = async function({core, exec}) {
  core.summary.addRaw('## Old versions', true);
  core.summary.addRaw(getBody(), true).addEOL();
  await core.summary.write();
  await exec.exec('npm', ['update']);

  const body = getBody();
  core.summary.addRaw('## New versions', true);
  core.summary.addRaw(body, true).addEOL();
  await core.summary.write();
  return body;
}
