import should from 'should';
import os from 'os';
import fs from 'fs';
import path from 'path';
import idGen from 'uuid62';
import yaml from 'js-yaml';
import gateway from '../../lib/gateway.js';
import adminHelperFactory from '../common/admin-helper.js';
const adminHelper = adminHelperFactory();
import Config from '../../lib/config/config.js';

describe('REST: schemas', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen.v4() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  let gatewaySrv;
  before('fires up a new gateway instance', function () {
    return gateway({ config }).then(srv => {
      gatewaySrv = srv.app;
      return srv;
    });
  });

  after('close gateway srv', () => {
    gatewaySrv.close();
  });

  describe('when policies defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });

    it('should list all policy schemas', () => {
      return adminHelper.admin.config.schemas
        .list('policy')
        .then((schemasResult) => {
          const found = schemasResult.find(schemaResult => schemaResult.schema.$id.includes('basic-auth'));
          const other = schemasResult.filter(schemaResult => schemaResult.type !== 'policy');
          should(found.schema).not.be.undefined();
          should(found.schema.$id).containEql('basic-auth');
          should(found.type).be.eql('policy');
          should(other.length).be.eql(0);
        });
    });

    it('should find basic-auth policy', () => {
      return adminHelper.admin.config.schemas
        .list('http://express-gateway.io/schemas/policies/basic-auth.json')
        .then((schema) => {
          should(schema.schema.$id).containEql('basic-auth');
        });
    });
  });
});
