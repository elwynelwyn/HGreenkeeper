'use strict';
const DEFAULT_CONFIG_FILE_NAME = 'hgreenkeeper.config.js';
const DEFAULT_PENDING_FILE_NAME = 'hgreenkeeper.pending.json';
module.exports = {
    loadConfig,
    writeConfig,
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
let CONFIG_PATH;
function getConfig () {
    if (!CONFIG) {
        throw new Error(`Tried to access CONFIG before it has been loaded.`);
    }
    return CONFIG;
}

function writeConfig (config) {
    winston.verbose(`Writing config file to disk at ${CONFIG_PATH}`);
    return new Promise((resolve, reject) => {
        let configAsString = JSON.stringify(config, null, 4);
        fs.writeFile(CONFIG_PATH, configAsString, err => {
            if (err) {
                reject(`Failed to write to the config file at ${CONFIG_PATH}.\n${err}`);
                return;
            }
            winston.verbose(`Config file was successfully written to ${CONFIG_PATH}`);
            resolve();
        })
    });
}

function loadConfig (configPath) {
    CONFIG_PATH = configPath || path.resolve(CWD, DEFAULT_CONFIG_FILE_NAME);

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
                // No default config file found - that's OK, we can carry on and write a file with our defaults
                winston.verbose(`No config file found at default location, writing a new default config file.`);
                ensureConfigDefaultsAreSet({})
                    .then(defaultConfig => {
                        fs.writeFile(fullConfigPath, defaultConfig, err => {
                            if (err) {
                                reject(`No config file was found, and a default config file could not be written to disk at ${fullConfigPath}.\n`, err);
                                return;
                            }
                            winston.verbose(`Default config file has been written to ${fullConfigPath}.`);
                            resolve(defaultConfig);
                        });
                    });
            } else if (stats.isFile()) {
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
            },
            pendingUpdatesPath: path.join(CWD, DEFAULT_PENDING_FILE_NAME)
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
