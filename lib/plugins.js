import logger from './logger.js';
import eventBus from './eventBus.js';
import schemas from './schemas/index.js';
import { createRequire } from 'module';
import semver from 'semver';

const require = createRequire(import.meta.url);
const parentRequire = require('parent-require');

const loggerPlugins = logger.plugins;
const engineVersion = '1.2.0';
const prefix = 'express-gateway-plugin-';

export async function load({ config }) {
  config = config || (await import('./config/index.js')).default;
  const pluginsSettings = config.systemConfig.plugins || {};

  const loadedPlugins = [];
  loggerPlugins.debug(`Loading plugins. Plugin engine version: ${engineVersion}`);
  for (const pluginName in pluginsSettings) {
    const settings = pluginsSettings[pluginName] || {};
    let requireName = pluginName;
    if (settings.package) {
      requireName = settings.package;
    } else if (pluginName.indexOf(prefix) !== 0) {
      requireName = prefix + pluginName;
    }

    try {
      loggerPlugins.debug(`Loading plugin ${requireName}`);
      let plugin;
      try {
        plugin = (await import(requireName)).default || require(requireName);
      } catch (err) {
        plugin = parentRequire(requireName);
      }
      if (semver.lt(engineVersion, plugin.version)) {
        loggerPlugins.warn(`${plugin.version} is higher than engine version: ${engineVersion}; trying to load`);
      }

      // register schema and validate settings
      const validate = schemas.register('plugin', pluginName, plugin.schema);
      const { isValid, error } = validate(settings);
      if (!isValid) {
        throw new Error(`Failed to validate settings: ${error}`);
      }

      const services = (await import('./services/index.js')).default;
      const context = new PluginContext({ settings, config, services });
      plugin.init(context);
      loadedPlugins.push(context);
      loggerPlugins.info(`Loaded plugin ${pluginName} from package ${requireName}`);
    } catch (err) {
      loggerPlugins.error(`Failed to load plugin ${requireName}: ${err}`);
    }
  }

  return {
    policies: extract(loadedPlugins, 'policies'),
    conditions: extract(loadedPlugins, 'conditions'),
    gatewayRoutes: extract(loadedPlugins, 'gatewayRoutes'),
    adminRoutes: extract(loadedPlugins, 'adminRoutes'),
    cliExtensions: extract(loadedPlugins, 'cliExtensions')
  };
}

class PluginContext {
  constructor ({ settings, config, services }) {
    this.logger = loggerPlugins;
    this.services = services;
    this.settings = settings || {};
    this.config = config;
    this.policies = [];
    this.conditions = [];
    this.gatewayRoutes = [];
    this.adminRoutes = [];
    this.cliExtensions = [];
    this.eventBus = eventBus;
  }

  registerPolicy (policy) {
    this.policies.push(policy);
  }

  registerCondition (condition) {
    this.conditions.push(condition);
  }

  registerGatewayRoute (gatewayRoutesDeclaration) {
    this.gatewayRoutes.push(gatewayRoutesDeclaration);
  }

  registerAdminRoute (adminRoutesDeclaration) {
    this.adminRoutes.push(adminRoutesDeclaration);
  }

  registerCLIExtension (cliExtension) {
    this.cliExtensions.push(cliExtension);
  }
}

function extract (loadedPlugins, propName) {
  return loadedPlugins.reduce((result, current) => {
    return result.concat(current[propName] || []);
  }, []);
}
