import express from 'express';
const jsonParser = express.json();
const urlEncoded = express.urlencoded({ extended: true });
import { PassThrough } from 'stream';
import transformObject from './transform-object.js';
import formurlencoded from 'form-urlencoded';
import schema from './schema.js';

export default {
  schema,
  policy: params => {
    return (req, res, next) => {
      let contentType = 'application/x-www-form-urlencoded';

      if (params.headers) {
        transformObject(params.headers, req.egContext, req.headers);
      }

      if (params.body) {
        jsonParser(req, res, (err) => {
          if (err) return next(err);
          if (Object.keys(req.body).length !== 0) contentType = 'application/json';

          urlEncoded(req, res, (err) => {
            if (err) return next(err);
            if (Object.keys(req.body).length === 0) contentType = 'application/json';

            const serializeFn = contentType === 'application/json' ? JSON.stringify : formurlencoded.default;

            const bodyData = serializeFn(transformObject(params.body, req.egContext, req.body));

            req.headers['content-length'] = Buffer.byteLength(bodyData);
            req.headers['content-type'] = contentType;

            req.egContext.requestStream = new PassThrough();
            req.egContext.requestStream.write(bodyData);

            next();
          });
        });
      } else {
        next();
      }
    };
  }
};
