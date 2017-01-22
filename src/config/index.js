'use strict';
const DEFAULT_CONFIG_FILE_NAME = 'hgreenkeeper.config.js';
module.exports = {
    loadConfig,
    getConfig,
    DEFAULT_CONFIG_FILE_NAME
};

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const deepExtend = require('deep-extend');

const projectUtils = require('../project');

const CWD = process.cwd();

let CONFIG;
function getConfig () {
    if (!CONFIG) {
        throw new Error(`Tried to access CONFIG before it has been loaded.`);
    }
    return CONFIG;
}

function loadConfig (configPath) {
    let getConfigPromise = configPath
        ? loadConfigFromUserSpecifiedPath(configPath)
        : loadConfigFromDefaultConfigLocation();

    return getConfigPromise
        .then(ensureConfigDefaultsAreSet)
        .then(programConfig => {
            CONFIG = programConfig;
            return CONFIG;
        });
}

function loadConfigFromUserSpecifiedPath (configPath) {
    return new Promise((resolve, reject) => {
        let fullConfigPath = path.resolve(CWD, configPath);
        fs.stat(fullConfigPath, (err, stats) => {
            if (err || !stats) {
                reject(`The path provided for the config file does not appear to be valid. Could not find file at ${fullConfigPath}.\n${err}`)
                return;
            }
            try {
                let userConfig = require(fullConfigPath);
                resolve(userConfig);
            } catch(e) {
                reject(`Unable to read the config file: ${e}`);
            }
        });
    });
}

function loadConfigFromDefaultConfigLocation () {
    return new Promise((resolve, reject) => {
        let fullConfigPath = path.resolve(CWD, DEFAULT_CONFIG_FILE_NAME);
        fs.stat(fullConfigPath, (err, stats) => {
            if (err || !stats) {
                // No default config file found - that's OK, we can carry on and run with our defaults
                resolve();
                return;
            }
            if (stats.isFile()) {
                try {
                    let userConfig = require(fullConfigPath);
                    resolve(userConfig);
                } catch(e) {
                    reject(`Found a config file at ${fullConfigPath} but was unable to read it: ${e}`);
                }
            }
        });
    });
}

function ensureConfigDefaultsAreSet (userConfig = {}) {
    return new Promise((resolve, reject) => {
        let defaultConfig = {
            port: 4321,
            pollInterval: 600000,
            hg: {
                branchFormat: 'hgreenkeeper-{packageName}-{latestVersion}',
                commitFormat: 'HGreenkeeper updated {packageName} from {wantedVersion} to {latestVersion}.'
            },
            notifications: {
                slackConfig: {
                    username: 'HGreenkeeper',
                    icon_emoji: ':sunflower:'
                },
                onBranchCreated: true,
                onUncommittedChanges: true
            }
        };

        let config = deepExtend(defaultConfig, userConfig);

        if (!config.projects || !config.projects.length) {
            throw new Error('No projects found in config file!');
        }

        let promises = [];
        config.projects.forEach(project => {
            project.fullPath = project.fullPath || path.resolve(CWD, project.path);
            if (!project.name) {
                let prom = projectUtils.readPackageJson(project.fullPath)
                    .then(packageJson => project.name = packageJson.name)
                    .catch(winston.warn);
                promises.push(prom);
            }
        });

        Promise.all(promises)
            .then(() => resolve(config))
    });
}
