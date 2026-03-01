import { Generator } from '../../eg.js';

export default class extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['scopes <command> [options]', 'scope'],
      desc: 'Manage scopes',
      builder: yargs => yargs
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('create'))
        .command(this.createSubCommand('info'))
        .command(this.createSubCommand('remove'))
        .command(this.createSubCommand('list'))
        .demandCommand()
    });
  }
}
