const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const root = path.resolve(__dirname,'..');
const spec = yaml.load(fs.readFileSync(path.join(root,'api-spec.yaml'),'utf8'));
fs.writeFileSync(path.join(root,'api-spec.json'), JSON.stringify(spec,null,2)+'\n');
