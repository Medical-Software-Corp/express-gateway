import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import yeoman from 'yeoman-environment';

import { executeInScope } from './execution-scope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const bootstrap = async (eg, adapter) => {
  const env = yeoman.createEnv();

  if (executeInScope(env)) {
    return;
  }

  env.eg = eg;

  if (adapter) {
    env.adapter = adapter;
  }

  const program = yargs();

  const generatorsPath = path.join(__dirname, 'generators');

  const prefix = 'express-gateway';

  const commands = [];
  const subCommands = {};

  const dirs = fs
    .readdirSync(generatorsPath)
    .filter(dir => {
      if (dir[0] === '.') {
        return false;
      }

      const stat = fs.statSync(path.join(generatorsPath, dir));
      return stat.isDirectory();
    });

  // Use dynamic imports to load generators
  for (const dir of dirs) {
    const directoryPath = path.join(generatorsPath, dir);

    const files = fs
      .readdirSync(directoryPath)
      .filter(file => {
        if (file[0] === '.') {
          return false;
        }

        const stat = fs.statSync(path.join(directoryPath, file));
        return stat.isFile();
      });

    for (const file of files) {
      if (file === 'index.js') {
        const namespace = `${prefix}:${dir}`;
        const filePath = path.join(directoryPath, file);
        const fileUrl = new URL('file://' + filePath.replace(/\\/g, '/'));
        const module = await import(fileUrl.href);
        commands.push({ namespace: namespace, path: directoryPath, Generator: module.default });
        env.registerStub(module.default, namespace);
        continue;
      }

      const filePath = path.join(directoryPath, file);
      const namespace = `${prefix}:${dir}:${file.slice(0, -3)}`;

      if (!subCommands.hasOwnProperty(dir)) {
        subCommands[dir] = [];
      }

      const fileUrl = new URL('file://' + filePath.replace(/\\/g, '/'));
      const module = await import(fileUrl.href);
      subCommands[dir].push({
        namespace: namespace,
        path: filePath,
        Generator: module.default
      });

      env.registerStub(module.default, namespace);
    }
  }

  const commandAliases = {};
  // Ex: {
  //       'user': 'users',
  //       'users': 'users'
  //     }
  commands.forEach(command => {
    const generator = env.create(command.namespace);

    let aliases = generator._configuration.command;
    if (!Array.isArray(aliases)) {
      aliases = [aliases];
    }

    aliases = aliases.map(alias => {
      return alias.split(/\s/)[0];
    });

    const commandName = command.namespace.split(':')[1];

    aliases.forEach(a => {
      commandAliases[a] = commandName;
    });

    program.command(generator._configuration);
  });

  const subCommandAliases = {};
  // Ex: {
  //       'users': {
  //         'rm': 'remove',
  //         'remove: 'remove'
  //       }
  //     }
  Object.keys(subCommands).forEach(key => {
    const subCommandArray = subCommands[key];

    subCommandAliases[key] = {};

    subCommandArray.forEach(s => {
      const generator = env.create(s.namespace);

      let aliases = generator._configuration.command;

      if (!Array.isArray(aliases)) {
        aliases = [aliases];
      }

      aliases = aliases.map(alias => {
        return alias.split(/\s/)[0];
      });

      const commandName = s.namespace.split(':')[2];

      aliases.forEach(a => {
        subCommandAliases[key][a] = commandName;
      });
    });
  });

  env.commandAliases = [commandAliases, subCommandAliases];

  program
    .usage('Usage: $0 <command> [options]')
    .demandCommand()
    .recommendCommands()
    .strict()
    .alias('h', 'help')
    .wrap(Math.min(90, program.terminalWidth()));

  return { program, env };
};
