import should from 'should';
import services from '../../lib/services.js';
const authCodeService = services.authorizationCode;
import db from '../../lib/db.js';

describe('Authorization Code Tests', function () {
  let newCode, codeFromDb;

  before(function () {
    return db.flushdb();
  });

  it('should save a code', function (done) {
    newCode = {
      consumerId: 'clientId',
      userId: 'userId',
      redirectUri: 'redirectUri',
      scopes: ['scope1', 'scope2']
    };

    authCodeService.save(newCode)
      .then((code) => {
        should.exist(code);
        should.exist(code.id);
        code.id.length.should.be.greaterThan(15);
        should.ok(new Date(code.expiresAt) > Date.now());
        code.should.have.properties(newCode);
        codeFromDb = code;
        done();
      })
      .catch(done);
  });

  it('should find a code', function (done) {
    const criteria = Object.assign(newCode, { id: codeFromDb.id });

    authCodeService.find(criteria)
      .then((code) => {
        codeFromDb.should.deepEqual(code);
        done();
      })
      .catch(done);
  });

  it('should not find a code the second time', function (done) {
    const criteria = Object.assign(newCode, { id: codeFromDb.id });

    authCodeService.find(criteria)
      .then((code) => {
        should.not.exist(code);
        done();
      })
      .catch(done);
  });
});
