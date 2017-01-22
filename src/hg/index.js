'use strict';
const branches = require('./branches');
module.exports = {
    getUpdateBranchName: branches.getUpdateBranchName,
    branchExists: branches.branchExists,
    createBranch: branches.createBranch,
    commitChanges,
    getCommitMessage,
    push,
    pullU,
    updateToDefault,
    hasUncommittedChanges
};

const winston = require('winston');
const hg = require('hg');
const config = require('../config');

function commitChanges (repoPath, commitMessage) {
    return new Promise((resolve, reject) => {
        const repo = new hg.HGRepo(repoPath);
        repo.commit(`-m ${commitMessage}`, () => {
            winston.verbose(`Committed changes with message "${commitMessage}"`);
            resolve();
        });
    });
}

function getCommitMessage (outdatedPackage) {
    const CONFIG = config.getConfig();
    return CONFIG.hg.commitFormat
        .replace('{packageName}', outdatedPackage.packageName)
        .replace('{wantedVersion}', outdatedPackage.wantedVersion)
        .replace('{latestVersion}', outdatedPackage.latestVersion);
}

function push (repoPath) {
    return new Promise((resolve, reject) => {
        const repo = new hg.HGRepo(repoPath);
        repo.runCommand('push', '--new-branch', () => {
            winston.verbose(`Pushed repo with --new-branch flag`);
            resolve();
        });
    });
}

function pullU (repoPath) {
    return new Promise((resolve, reject) => {
        winston.info(`Running "hg pull -u" on repo ${repoPath}`);
        const repo = new hg.HGRepo(repoPath);
        repo.runCommand('pull', '--update', () => {
            winston.verbose(`Pulled and updated repo ${repoPath}`);
            resolve();
        });
    });
}

function updateToDefault (repoPath) {
    return new Promise((resolve, reject) => {
        const repo = new hg.HGRepo(repoPath);
        repo.runCommand('update', 'default', () => {
            winston.verbose(`Updated to default.`);
            resolve();
        });
    });
}

function hasUncommittedChanges (repoPath) {
    return new Promise((resolve, reject) => {
        const repo = new hg.HGRepo(repoPath);
        repo.runCommand('status', (err, rawOutput) => {
            let output;
            try {
                output = hg.Parsers.text(rawOutput);
            } catch (e) {}
            let hasChanges = (output || '').length > 0;
            winston.verbose(`Checked repo for uncommitted changes. hasChanges: ${hasChanges}. Status: ${output}`);
            resolve(hasChanges);
        });
    });
}
