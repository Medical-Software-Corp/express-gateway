'use strict';

import passport from 'passport';
import path from 'path';

export const loginForm = (request, response) => response.render(path.join(import.meta.dirname, 'views/login'));

export const login = passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' });

export const logout = (request, response) => {
  request.logout();
  response.redirect('/');
};
