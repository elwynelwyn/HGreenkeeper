'use strict';
module.exports = runCheck;

const fs = require('fs');
const path = require('path');
const winston = require('winston');

const projectUtils = require('../project');
const getOutdatedInfoWithYarn = require('./yarn-get-outdated-packages');
const getOutdatedInfoWithNpm = require('./npm-get-outdated-packages');

function runCheck (repoPath) {
    return projectUtils.hasYarnLock(repoPath)
        .then(hasYarnLock => {
            const packageJsonPath = path.join(repoPath, 'package.json');
            winston.verbose(`packageJsonPath resolved to: ${packageJsonPath}`);

            winston.verbose(`Starting network requests to npm registry to find outdated packages with ${hasYarnLock ? 'yarn' : 'npm'}`);
            return hasYarnLock
                ? getOutdatedInfoWithYarn(repoPath)
                : getOutdatedInfoWithNpm(repoPath);
        });
}
