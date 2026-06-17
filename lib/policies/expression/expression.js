'use strict';

export default (actionParams) => (req, res, next) => {
  req.egContext.run(actionParams.jscode);
  next();
};
