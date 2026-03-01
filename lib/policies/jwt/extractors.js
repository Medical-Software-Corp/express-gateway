import passportJWT from 'passport-jwt';

export default {
  header: passportJWT.ExtractJwt.fromHeader,
  query: passportJWT.ExtractJwt.fromUrlQueryParameter,
  authScheme: passportJWT.ExtractJwt.fromAuthHeaderWithScheme,
  authBearer: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken
};
