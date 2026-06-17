import assert from 'assert';
import request from 'supertest';
import app from '../../oauth/bootstrap.js';
import environment from '../../fixtures/cli/environment.js';
import adminHelperFactory from '../../common/admin-helper.js';
const adminHelper = adminHelperFactory();
const namespace = 'express-gateway:tokens:revoke';
import idGen from 'uuid62';
import services from '../../../lib/services.js';
const authService = services.auth;

describe('eg tokens revoke', () => {
  let program, env, user, accessToken;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    return adminHelper.admin.users.create({
      username: idGen.v4(),
      firstname: 'f',
      lastname: 'l'
    })
      .then(createdUser => {
        user = createdUser;
        return Promise.all([
          adminHelper.admin.credentials.create(user.username, 'oauth2'),
          adminHelper.admin.credentials.create(user.username, 'basic-auth')
        ]);
      })
      .then(([oauthCredentials, basicCredentials]) => {
        const base64Credentials = Buffer.from(`${oauthCredentials.id}:${oauthCredentials.secret}`).toString('base64');
        return request(app)
          .post('/oauth2/token')
          .set('Authorization', `basic ${base64Credentials}`)
          .set('content-type', 'application/x-www-form-urlencoded')
          .type('form')
          .send({
            grant_type: 'password',
            username: basicCredentials.id,
            password: basicCredentials.password
          })
          .expect(200);
      })
      .then(res => {
        const token = res.body;
        assert.ok(token);
        assert.ok(token.access_token);
        accessToken = token.access_token;
        assert.strictEqual(token.token_type, 'Bearer');
        return authService.authenticateToken(accessToken);
      })
      .then(res => {
        assert.strictEqual(res.consumer.username, user.username);
      });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('revokes token', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.ok = message => {
          output = message;
        };
        generator.log.error = message => {
          done(new Error(message));
        };
      });

      generator.once('end', () => {
        assert.strictEqual(output, 'Access token has been revoked: ' + accessToken);
        return authService.authenticateToken(accessToken).then(r => {
          assert.ok(!r); // authentication failed
          done();
        }).catch(done);
      });
    });

    env.argv = program.parse('tokens revoke ' + accessToken);
  });
  it('revokes token -q', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.stdout = message => {
          output = message;
        };
        generator.log.error = message => {
          done(new Error(message));
        };
      });

      generator.once('end', () => {
        assert.strictEqual(output, accessToken);
        return authService.authenticateToken(accessToken).then(r => {
          assert.ok(!r); // authentication failed
          done();
        }).catch(done);
      });
    });

    env.argv = program.parse('tokens revoke -q ' + accessToken);
  });
});
