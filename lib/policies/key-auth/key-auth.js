import passport from 'passport';
import LocalAPIKeyStrategy from './passport-apikey-strategy.js';
import services from '../../services/index.js';
import { policy as logger } from '../../logger/index.js';
const authService = services.auth;
const credentialType = 'key-auth';
passport.use(new LocalAPIKeyStrategy({ passReqToCallback: true }, (req, apikey, done) => {
  // key will look like "h1243h1kl23h4kjh:asfasqwerqw"
  if (!apikey) {
    return done(null, false);
  }

  const keyParts = apikey.split(':');

  authService.authenticateCredential(keyParts[0], keyParts[1], credentialType)
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }
      const endpointScopes = req.egContext.apiEndpoint.scopes && req.egContext.apiEndpoint.scopes.map(s => s.scope || s);

      return authService.authorizeCredential(keyParts[0], credentialType, endpointScopes)
        .then(authorized => {
          if (!authorized) {
            return done(null, false, { unauthorized: true });
          }
          consumer.authorizedScopes = endpointScopes;
          return done(null, consumer);
        });
    })
    .catch(err => {
      logger.warn(err);
      done(err);
    });
}));

export default function (params) {
  return function (req, res, next) {
    params.session = false;
    passport.authenticate('localapikey', params, params.getCommonAuthCallback(req, res, next))(req, res, next);
  };
}
