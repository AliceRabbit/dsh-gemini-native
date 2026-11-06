import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import semver from 'semver';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
// DSH admits prerelease runtime versions when evaluating engines.dsh.
const matches = (version, range) => semver.satisfies(version, range, { includePrerelease: true });
const dshPeers = ['@deepseek-ai/dsh-launch-environment', '@deepseek-ai/dsh-llm'];

test('DSH compatibility allows the 0.2 release line instead of enumerating tested RCs', () => {
  const range = manifest.engines.dsh;
  assert.equal(range, '>=0.2.1-rc.3 <0.3.0-0');
  assert.ok(semver.validRange(range));
  for (const version of ['0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5', '0.2.1-rc.6', '0.2.1', '0.2.2-rc.1', '0.2.2', '0.2.99-rc.1', '0.2.99']) {
    assert.ok(matches(version, range), `DSH ${version} must be admitted by the declared range`);
    for (const name of dshPeers) {
      assert.equal(manifest.peerDependencies[name], range, `${name} must stay aligned with engines.dsh`);
      assert.ok(matches(version, manifest.peerDependencies[name]), `${name} must admit ${version}`);
    }
  }
});

test('compatibility excludes older releases and every 0.3 prerelease or later release line', () => {
  for (const version of ['0.1.99', '0.2.0', '0.2.1-rc.2', '0.3.0-0', '0.3.0-alpha.1', '0.3.0-rc.1', '0.3.0', '0.3.1', '1.0.0']) {
    assert.equal(matches(version, manifest.engines.dsh), false, version);
  }
});

test('fixed development dependencies stay within the runtime and library compatibility ranges', () => {
  for (const name of dshPeers) {
    assert.ok(semver.valid(manifest.devDependencies[name]), `${name} development version must remain reproducible`);
    assert.ok(matches(manifest.devDependencies[name], manifest.engines.dsh), name);
    assert.ok(matches(manifest.devDependencies[name], manifest.peerDependencies[name]), name);
  }
  for (const version of ['3.18.5', '3.19.0']) {
    assert.ok(matches(version, manifest.peerDependencies['@deepseek-ai/schemastery']));
  }
  assert.equal(matches('4.0.0', manifest.peerDependencies['@deepseek-ai/schemastery']), false);
});

test('manifest and lockfile retain the same plugin version and admission ranges', () => {
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].version, manifest.version);
  assert.equal(lock.packages[''].engines.dsh, manifest.engines.dsh);
  for (const name of [...dshPeers, '@deepseek-ai/schemastery']) {
    assert.equal(lock.packages[''].peerDependencies[name], manifest.peerDependencies[name]);
  }
});
