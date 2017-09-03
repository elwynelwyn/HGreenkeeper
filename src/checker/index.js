'use strict';
module.exports = {
    runOutdatedCheckerForProject
};

const winston = require('winston');

const config = require('../config');
const hg = require('../hg');
const notifications = require('../notifications');
const projectUtils = require('../project');
const runCheck = require('../registry');
const runYarnInstall = require('../registry/run-yarn-install');
const utils = require('../utils');
const pending = require('../pending');

function runOutdatedCheckerForProject (project) {
    winston.info(`Running outdated check for project "${project.name}".`);

    return new Promise((resolve, reject) => {
        runCheck(project.fullPath)
            .then(outdated => {
                if (!outdated || !outdated.length) {
                    winston.verbose('No updates found!');
                    resolve([]);
                } else {
                    winston.verbose(`Found required updates for ${project.name}`, outdated);
                    hg.hasUncommittedChanges(project.fullPath)
                        .then(hasUncommittedChanges => {
                            if (hasUncommittedChanges) {
                                winston.warn(`Project "${project.name}" has outdated packages, but there are uncommitted changes, so HGreenkeeper is skipping for now.`);
                                notifications.onUncommittedChanges(project);
                                resolve();
                            } else {
                                handleOutdatedPackages(project, outdated)
                                    .then(projectNeedsPush => {
                                        if (projectNeedsPush) {
                                            hg.push(project.fullPath)
                                                .then(resolve);
                                        } else {
                                            resolve();
                                        }
                                    });
                            }
                        });
                }
            }).catch(err => {
                if (err && err.indexOf('Outdated lockfile') !== -1) {
                    handleOutdatedYarnLockFile(project)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(err);
                }
            });
    });
}

function handleOutdatedPackages (project, outdated) {
    let projectNeedsPush = false;

    let tasks = outdated.map(outdatedPackage => {
        return () => {
            return handleOutdatedPackage(project, outdatedPackage)
                .then(needsPush => {
                    projectNeedsPush = projectNeedsPush || needsPush;
                });
        };
    });

    return utils.promiseSequence(tasks)
        .then(() => projectNeedsPush);
}


function handleOutdatedPackage (project, outdatedPackage) {
    let branchName = hg.getUpdateBranchName(outdatedPackage);

    return hg.branchExists(project.fullPath, branchName)
        .then(exists => {
            if (exists) {
                winston.verbose(`Branch ${branchName} already exists, no further action required`);
                return false; // return false to specify this repo does not need a push
            } else {
                winston.verbose(`Branch ${branchName} does not yet exist - creating.`);
                return handleOutdatedPackageThatDoesNotYetHaveABranch(project, branchName, outdatedPackage);
            }
        });
}

function handleOutdatedPackageThatDoesNotYetHaveABranch (project, branchName, outdatedPackage) {
    return hg.createBranch(project.fullPath, branchName)
        .then(() => projectUtils.readPackageJson(project.fullPath))
        .then(packageJson => {
            // update the version number to latest
            packageJson[outdatedPackage.packageType][outdatedPackage.packageName] = outdatedPackage.latestVersion;
            winston.verbose(`Updated version for ${outdatedPackage.packageName} in package.json`);
            return packageJson;
        })
        .then(updatedPackageJson => projectUtils.writePackageJson(project.fullPath, updatedPackageJson))
        .then(() => projectUtils.refreshYarnLockIfNeeded(project.fullPath))
        .then(() => {
            let commitMessage = hg.getCommitMessage(outdatedPackage);
            return hg.commitChanges(project.fullPath, commitMessage);
        })
        .then(() => hg.updateToDefault(project.fullPath))
        .then(() => pending.addBranch(project, branchName, outdatedPackage))
        .then(() => {
            notifications.onBranchCreated(project, outdatedPackage, branchName);
            // return true flag to specify this repo needs to be pushed
            return true;
        });
}

function handleOutdatedYarnLockFile (project) {
    winston.info(`The yarn lockfile is out of date. Running a yarn install before continuing. This will likely result in uncomitted changes to yarn.lock, meaning HGreenkeeper will be unable to continue.`);
    return runYarnInstall(project.fullPath)
        .then(() => runOutdatedCheckerForProject(project));
}
