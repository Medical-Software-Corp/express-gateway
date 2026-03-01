import express from 'express';
import schemas from '../../schemas/index.js';

export default function () {
  const router = express.Router();

  router.get('/:param?', function (req, res) {
    const { param } = req.params;
    res.json(schemas.find(param));
  });

  return router;
}
