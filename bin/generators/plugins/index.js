import { Generator } from '../../eg.js';

export default class extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['plugins <command> [options]', 'plugin'],
      desc: 'Manage plugins',
      builder: yargs => yargs
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('install'))
        .command(this.createSubCommand('configure'))
        .demandCommand()
    });
  }
}
