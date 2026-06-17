import Config from './config.js';
import logger from '../logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const log = logger.config;

if (!process.env.EG_CONFIG_DIR) {
  process.env.EG_CONFIG_DIR = __dirname;
}

const config = new Config();

try {
  config.loadModels();
  ['system', 'gateway'].forEach(type => config.loadConfig(type));
} catch (err) {
  log.error(err);
  throw err;
}

export default config;
