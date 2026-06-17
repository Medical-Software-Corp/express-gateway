import path from 'path';
import { fileURLToPath } from 'url';
import gateway from 'express-gateway';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

gateway()
  .load(path.join(__dirname, 'config'))
  .run();
