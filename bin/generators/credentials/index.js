import { Generator } from '../../eg.js';

export default class extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['credentials <command> [options]', 'credential'],
      desc: 'Manage credentials',
      builder: yargs => yargs
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('create'))
        .command(this.createSubCommand('activate'))
        .command(this.createSubCommand('deactivate'))
        .command(this.createSubCommand('info'))
        .command(this.createSubCommand('list'))
        .demandCommand()
    });
  }
}
