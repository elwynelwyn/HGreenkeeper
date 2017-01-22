'use strict';
module.exports = {
    getUpdateBranchName,
    branchExists,
    createBranch
};

const hg = require('hg');
const winston = require('winston');
const config = require('../config');

function getUpdateBranchName (outdatedPackage) {
    const CONFIG = config.getConfig();
    return CONFIG.hg.branchFormat
            .replace('{packageName}', outdatedPackage.packageName)
            .replace('{wantedVersion}', outdatedPackage.wantedVersion)
            .replace('{latestVersion}', outdatedPackage.latestVersion);
}

function branchExists(fullRepoPath, branchName) {
    return getBranches(fullRepoPath).then(branches => {
        return branches.indexOf(branchName) !== -1;
    });
}

function getBranches (fullRepoPath) {
    return new Promise((resolve, reject) => {
        const repo = new hg.HGRepo(fullRepoPath);
        repo.branches({'-T': 'json'}, (err, output) => {
            if (err) {
                throw err;
            }

            let branches = hg.Parsers.json(output);
            resolve(branches.map(b => b.branch));
        });
    });
}

function createBranch (fullRepoPath, branchName) {
    return new Promise((resolve, reject) => {
        const repo = new hg.HGRepo(fullRepoPath);
        repo.runCommand('branch', branchName, () => {
            winston.info(`Created branch ${branchName}`);
            resolve();
        });
    });
}
