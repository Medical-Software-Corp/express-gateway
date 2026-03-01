'use strict';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import passport from 'passport';
import path from 'path';

export const loginForm = (request, response) => response.render(path.join(__dirname, 'views/login'));

export const login = passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' });

export const logout = (request, response) => {
  request.logout();
  response.redirect('/');
};
