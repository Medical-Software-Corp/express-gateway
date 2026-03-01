import logger from './logger.js';
import config from './config/index.js';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const loggerDb = logger.db;
const redisOptions = config.systemConfig.db && config.systemConfig.db.redis;

// special mode, will emulate all redis commands.
// designed for demo and test scenarious to avoid having real Redis instance
const emulate = process.argv[2] === 'emulate' || redisOptions.emulate;

if (redisOptions.tls) {
  if (redisOptions.tls.keyFile) {
    redisOptions.tls.key = fs.readFileSync(redisOptions.tls.keyFile);
  };

  if (redisOptions.tls.certFile) {
    redisOptions.tls.cert = fs.readFileSync(redisOptions.tls.certFile);
  }

  if (redisOptions.tls.caFile) {
    redisOptions.tls.ca = fs.readFileSync(redisOptions.tls.caFile);
  }
}

const Redis = emulate ? require('ioredis-mock') : require('ioredis');
const db = new Redis(redisOptions);

db.on('ready', () => { loggerDb.debug('Redis is ready'); });
db.on('error', err => { loggerDb.error(`Error in Redis: ${err}`); });

export default db;
