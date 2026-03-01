import { Generator } from '../../eg.js';

export default class extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'gateway <command> [options]',
      desc: 'Manage a gateway',
      builder: yargs => yargs
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('create'))
        .demandCommand()
    });
  }
}
