'use strict';
module.exports = runYarnInstall;

const winston = require('winston');
const child_process = require('child_process');

function runYarnInstall (repoPath) {
    return new Promise((resolve, reject) => {
        winston.verbose('Starting yarn install');
        const child = child_process.exec('yarn', { cwd: repoPath });
        child.stdout.on('data', (data) => {
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) {}
            if (json) {
                if (json.type === 'warning') {
                    winston.warn(json.data || data);
                } else {
                    winston.verbose(json.data || data);
                }
            } else {
                winston.verbose(data);
            }
        });
        child.stderr.on('data', (data) => {
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) {}
            if (json) {
                if (json.type === 'warning') {
                    winston.warn(json.data || data);
                } else {
                    winston.error(json.data || data);
                }
            } else {
                winston.error(data);
            }
        });
        child.on('close', function (exitCode) {
            if (exitCode === 0) {
                winston.verbose('Yarn install has run to update yarn.lock.');
                resolve();
            } else {
                reject('Failed while running "yarn" to install new version. Lockfile may be outdated. Exit code ' + exitCode);
                // retry?
            }
        });
    });
}
