import express from 'express';
import services from '../../services/index.js';

const tokenSrv = services.token;

export default function () {
  const router = express.Router();

  router.delete('/:token', function (req, res, next) {
    tokenSrv.revoke(req.params.token)
      .then(status => {
        if (!status) {
          return res.status(404).send('token not found: ' + req.params.token);
        }
        res.json(status);
      })
      .catch(err => { next(err); });
  });

  return router;
}
