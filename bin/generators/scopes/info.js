import { Generator } from '../../eg.js';
export default class extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info [options] <scope>',
      desc: 'Show details for a single scope',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info [options] <scope>`)
    });
  }

  prompting () {
    return this.admin.scopes.info(this.argv.scope)
      .then(res => {
        this.stdout(res.scope);
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
}
