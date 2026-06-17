import authorizationCode from './authorization-codes/authorization-code.service.js';
import user from './consumers/user.service.js';
import application from './consumers/application.service.js';
import credential from './credentials/credential.service.js';
import token from './tokens/token.service.js';
import auth from './auth.js';

const s = {};

s.authorizationCode = authorizationCode;
s.user = user;
s.application = application;
s.credential = credential;
s.token = token;
s.auth = auth;

export default s;
