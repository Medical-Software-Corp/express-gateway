import superagent from 'superagent';
import superagentPrefix from 'superagent-prefix';
import superagentLogger from 'superagent-logger';

export default ({ baseUrl, verbose, headers }) => {
  const agent = superagent
    .agent()
    .use(superagentPrefix(baseUrl));

  if (headers) {
    agent.set(headers);
  }

  if (verbose) {
    agent.use(superagentLogger);
  }

  return agent;
};
