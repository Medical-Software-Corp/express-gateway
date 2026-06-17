import logger from './instance.js';

export default (params) =>
  (req, res, next) => {
    try {
      logger.info(req.egContext.evaluateAsTemplateString(params.message));
    } catch (e) {
      logger.error(`failed to build log message: ${e.message}`);
    }
    next();
  };
