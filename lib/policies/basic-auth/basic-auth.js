import registerStrategy from './registerStrategy.js';
registerStrategy();
import passport from 'passport';

export default function (actionParams) {
  return function (req, res, next) {
    actionParams.session = false;
    passport.authenticate('basic', actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
}
