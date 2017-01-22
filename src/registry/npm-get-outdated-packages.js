'use strict';
module.exports = getOutdatedInfoWithNpm;

const child_process = require('child_process');
const winston = require('winston');
const projectUtils = require('../project');

function getOutdatedInfoWithNpm (repoPath) {
    return new Promise((resolve, reject) => {
        const child = child_process.exec('npm outdated --json', { cwd: repoPath });
        let response;
        child.stdout.on('data', (data) => {
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) { }
            if (json) {
                response = json;
            } else {
                winston.verbose('[npm outdated] '+ data);
            }
        });
        child.stderr.on('data', (data) => {
            winston.error('[npm outdated] '+ data);
        });
        child.on('close', function (exitCode) {
            if (exitCode === 0) {
                parseNpmOutput(repoPath, response)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(`Failed while getting outdated packages statuses. Exit code ${exitCode}`);
                // retry?
            }
        });
    });
}

function parseNpmOutput (repoPath, packagesInfo = {}) {
    winston.verbose('Got data from npm, parsing it now');
    return projectUtils.readPackageJson(repoPath)
        .then(projectJson => {
            return Object.keys(packagesInfo).map(packageName => {
                let wantedVersion = packagesInfo[packageName].wanted;

                let deps = projectJson.dependencies;
                let devDeps = projectJson.devDependencies;

                let packageType;
                if (deps[packageName] && deps[packageName] === wantedVersion) {
                    packageType = 'dependencies';
                } else if (devDeps[packageName] && devDeps[packageName] === wantedVersion) {
                    packageType = 'devDependencies';
                } else {
                    throw new Error(`Could not determine if package "${packageName}" is in dependencies or devDependencies.`);
                }
                return {
                    packageName,
                    wantedVersion,
                    latestVersion: packagesInfo[packageName].latest,
                    packageType
                }
            });
        });
}
