'use strict';
module.exports = getOutdatedInfoWithYarn;

const child_process = require('child_process');
const winston = require('winston');

function getOutdatedInfoWithYarn (repoPath) {
    return new Promise((resolve, reject) => {
        winston.verbose(`Spawning child process in ${repoPath}: yarn outdated --json`);
        const child = child_process.exec('yarn outdated --json', { cwd: repoPath });

        let response;
        let outdatedLockfile = false;
        child.stdout.on('data', (data) => {
            winston.verbose(`Child process stdout got data`);
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) { }
            if (json) {
                if (json.type === 'table') {
                    response = json;
                } else if (json.type !== 'finished') {
                    winston.verbose('[yarn outdated] '+ data);
                } else {
                    winston.verbose('[yarn outdated] '+ data);
                }
            } else {
                winston.verbose('[yarn outdated] '+ data);
            }
        });
        child.stderr.on('data', (data) => {
            winston.verbose(`Child process stderr got data`);
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) {}
            if (json) {
                if (json.type === 'warning') {
                    winston.warn('[yarn outdated] '+ json.data || data);
                } else {
                    winston.error('[yarn outdated] ' + json.data || data);
                    if (json.data && json.data.indexOf('Outdated lockfile') !== -1) {
                        outdatedLockfile = true;
                    }
                }
            } else {
                winston.error('[yarn outdated] '+ data);
            }
        });
        child.on('exit', function (exitCode) {
            winston.verbose(`Child process exited`);
            if (response) {
                resolve(parseYarnOutput(response));
            } else {
                reject(`Failed while getting outdated packages statuses. ${outdatedLockfile ? 'Outdated lockfile. ' : ''}Exit code ${exitCode}`);
                // retry?
            }
        });
    });
}

function parseYarnOutput (data = { data: {} }) {
    winston.verbose('Got data from yarn, parsing it now');
    let packagesInfo = data.data.body || [];
    return packagesInfo.map(pInfo => {
        let packageName = pInfo[ 0 ];   // 'Package'
        // let currentlyInstalled [1] // 'Current'
        let wantedVersion = pInfo[ 2 ]; // 'Wanted'
        let latestVersion = pInfo[ 3 ]; // 'Latest'
        let packageType = pInfo[ 4 ];   // 'Package Type'
        return { packageName, wantedVersion, latestVersion, packageType };
    });
}
