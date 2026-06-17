import rest from '../../lib/rest/index.js';
import adminClient from '../../admin/index.js';
import db from '../../lib/db.js';

export default function () {
  return {
    start ({ config } = {}) {
      return rest({ config }).then((srv) => {
        this.adminSrv = srv;
        const srvInfo = srv.address();
        this.admin = adminClient({
          baseUrl: `http://${srvInfo.address}:${srvInfo.port}`
        });
        return this.adminSrv;
      });
    },
    stop () {
      this.adminSrv && this.adminSrv.close();
      return this.reset();
    },
    reset () {
      return db.flushdb();
    }
  };
}
