const fs = require('fs');

const files = [
  'settings-layout.js',
  'settings-company.js',
  'settings-branches.js',
  'settings-industry.js',
  'settings-fiscal-year.js',
  'settings-currency-tax.js',
  'settings-branding.js'
];

for (const f of files) {
  const p = 'd:/DEMO/ERP1/src/pages/' + f;
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, 'utf8');
  // Replace \` with ` and \$ with $
  c = c.replace(/\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(p, c);
  console.log('Fixed', f);
}
