import express from 'express';
import config from '../../lib/config.js';
import oauth2 from '../../lib/policies/oauth2/oauth2-routes.js';
import '../../lib/policies/oauth2/oauth2.js';
import '../../lib/policies/basic-auth/basic-auth.js';

const app = express();
export default oauth2(app, config);