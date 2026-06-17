import fs from 'fs';
import yaml from 'js-yaml';

// this module is to abstract saving files in json/yml format
export default {
  read: function (path, type) {
    const text = fs.readFileSync(path);
    if (type === 'json') { return JSON.parse(text); }
    if (type === 'yml') { return yaml.load(text); }
  },

  save: function (text, path, type) {
    if (type === 'json') { fs.writeFileSync(path, JSON.stringify(text)); }
    if (type === 'yml') { fs.writeFileSync(path, yaml.dump(text)); }
  }
};
