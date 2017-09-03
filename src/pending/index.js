'use strict';
module.exports = {
    addBranch,
    getPending
};

const winston = require('winston');
const config = require('../config');
const fs = require('fs');

function getPending () {
    return new Promise((resolve, reject) => {
        let cfg = config.getConfig();

        fs.stat(cfg.pendingUpdatesPath, (err, stats) => {
            if (err || !stats) {
                // No default config file found - that's OK, we can carry on and run with our defaults
                resolve({});
                return;
            }
            if (stats.isFile()) {
                try {
                    let pending = require(cfg.pendingUpdatesPath);
                    resolve(pending);
                } catch(e) {
                    reject(`Found pending updates file at ${cfg.pendingUpdatesPath} but was unable to read it: ${e}`);
                }
            }
        });
    });
}

function writePending (pending) {
    let cfg = config.getConfig();
    winston.verbose(`Writing pending file to disk at ${cfg.pendingUpdatesPath}`);

    return new Promise((resolve, reject) => {
        let pendingAsString = JSON.stringify(pending, null, 4);
        fs.writeFile(cfg.pendingUpdatesPath, pendingAsString, err => {
            if (err) {
                reject(`Failed to write to the pending file at ${cfg.pendingUpdatesPath}.\n${err}`);
                return;
            }
            winston.verbose(`Pending file was successfully written to ${cfg.pendingUpdatesPath}`);
            resolve();
        })
    });
}

function addBranch (project, branchName, outdatedPackage) {
    winston.verbose(`Adding branch ${branchName} to pending list for project ${project.name}`);

    return getPending()
        .then(pending => {
            pending[project.path] = pending[project.path] || {};
            pending[project.path][outdatedPackage.packageName] = pending[project.path][outdatedPackage.packageName] || {};
            pending[project.path][outdatedPackage.packageName][outdatedPackage.latestVersion] = branchName;

            winston.verbose(`Updated pending: `, pending);
            return writePending(pending);
        });
}
