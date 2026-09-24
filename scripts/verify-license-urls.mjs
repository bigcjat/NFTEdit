import fs from 'fs';

const file = fs.readFileSync('src/utils/licenses.ts', 'utf8');
const presetPart = file.slice(0, file.indexOf('export function filterLicenses'));
const js = presetPart
  .replace(/import type [^;]+;/g, '')
  .replace(/: LicensePreset\[\]/g, '')
  .replace(/export /g, '');

const fn = new Function(js + '; return PRESET_LICENSES;');
const licenses = fn();

console.log(`Auditing all ${licenses.length} preset licenses from src/utils/licenses.ts...\n`);

const results = [];

for (let i = 0; i < licenses.length; i++) {
  const lic = licenses[i];
  
  // Test both licenseUrl and deedUrl (if different)
  const targets = [{ field: 'licenseUrl', url: lic.licenseUrl }];
  if (lic.deedUrl && lic.deedUrl !== lic.licenseUrl) {
    targets.push({ field: 'deedUrl', url: lic.deedUrl });
  }

  for (const { field, url } of targets) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const resp = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      const elapsed = Date.now() - start;
      const finalUrl = resp.url;

      results.push({
        num: i + 1,
        id: lic.id,
        name: lic.name,
        category: lic.category,
        field,
        url,
        finalUrl,
        status: resp.status,
        ok: resp.ok,
        elapsed,
      });

      console.log(`[${resp.status}] ${resp.ok ? 'PASS' : 'FAIL'} | #${i + 1} ${lic.name} (${field}) | ${elapsed}ms`);
      if (finalUrl !== url) {
        console.log(`      ↳ Redirects to: ${finalUrl}`);
      }
    } catch (err) {
      console.log(`[ERR] FAIL | #${i + 1} ${lic.name} (${field}) | URL: ${url} | Error: ${err.message}`);
      results.push({
        num: i + 1,
        id: lic.id,
        name: lic.name,
        category: lic.category,
        field,
        url,
        finalUrl: null,
        status: 'ERROR',
        ok: false,
        error: err.message,
      });
    }
  }
}

const failed = results.filter(r => !r.ok);
console.log(`\n========================================`);
console.log(`Audit Summary:`);
console.log(`Total Preset Licenses: ${licenses.length}`);
console.log(`Total Target URLs Tested: ${results.length}`);
console.log(`Passed (HTTP 200 OK): ${results.length - failed.length}`);
console.log(`Failed / Unreachable: ${failed.length}`);
console.log(`========================================\n`);

if (failed.length > 0) {
  console.log(`Failed Details:`, JSON.stringify(failed, null, 2));
}

fs.writeFileSync('scripts/verification-report.json', JSON.stringify(results, null, 2));
