'use strict';

module.exports = {
    readPackageJson,
    writePackageJson,
    hasYarnLock,
    refreshYarnLockIfNeeded
};

const fs = require('fs');
const path = require('path');
const winston = require('winston');

const runYarnInstall = require('../registry/run-yarn-install');

function readPackageJson (projectPath) {
    return new Promise((resolve, reject) => {
        let packageJsonPath = path.join(projectPath, './package.json');

        fs.readFile(packageJsonPath, 'utf-8', (err, fileContents) => {
            if (err) {
                reject(`Error reading ${packageJsonPath}.\n${err}`);
            } else {
                try {
                    let json = JSON.parse(fileContents);
                    winston.verbose(`Read ${packageJsonPath}`);
                    resolve(json);
                } catch(e) {
                    reject(`Failed to read the project name from ${packageJsonPath}.\n${e}`);
                }
            }
        });
    });
}

function writePackageJson (projectPath, packageJson) {
    return new Promise((resolve, reject) => {
        let packageJsonPath = path.join(projectPath, './package.json');
        let fileContents = JSON.stringify(packageJson, null, 2);

        fs.writeFile(packageJsonPath, fileContents, (err) => {
            if (err) {
                reject(`Error writing ${packageJsonPath}.\n${err}`);
            } else {
                winston.verbose(`Wrote ${packageJsonPath}`);
                resolve();
            }
        });
    });
}

function hasYarnLock (projectPath) {
    return new Promise((resolve, reject) => {
        let yarnLockPath = path.join(projectPath, './yarn.lock');
        fs.stat(yarnLockPath, (err, stats) => {
            if (err || !stats) {
                winston.verbose(`Error when trying to see if ${yarnLockPath} exists: ${err}`);
                resolve(false);
            } else {
                winston.verbose(`Yarn.lock file found at ${yarnLockPath}`);
                resolve(true);
            }
        });
    });
}

function refreshYarnLockIfNeeded (projectPath) {
    return new Promise((resolve, reject) => {
        hasYarnLock(projectPath)
            .then(hasYarnLock => {
                if (!hasYarnLock) {
                    winston.verbose('No yarn.lock found, not running yarn.');
                    resolve();
                } else {
                    runYarnInstall(projectPath)
                        .then(() => {
                            resolve();
                        })
                        .catch(reject);
                }
            });
    });
}


