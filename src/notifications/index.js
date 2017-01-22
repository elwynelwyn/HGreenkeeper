'use strict';
module.exports = {
    onUncommittedChanges,
    onBranchCreated
};

const slack = require('./slack');
const config = require('../config');

function onUncommittedChanges (project) {
    const CONFIG = config.getConfig();
    if (!CONFIG.notifications.onUncommittedChanges) {
        winston.verbose(`Skipping notification for onUncommittedChanges for project "${project.name}".`)
    } else {
        let text = `Project *${project.name}* has outdated packages.\nHowever the repo has uncommitted changes. HGreenkeeper is unable to create an update branch :slightly_frowning_face:`;
        slack.sendSlackNotification({ text })
    }
}

function onBranchCreated (project, outdatedPackage, branchName) {
    const CONFIG = config.getConfig();
    if (!CONFIG.notifications.onBranchCreated) {
        winston.verbose(`Skipping notification for onBranchCreated for project "${project.name}" with new branch ${branchName}.`)
    } else {
        let message = {
            'text': `New update branch in *${project.name}* for package *${outdatedPackage.packageName}*!`,
            'attachments': [
                {
                    'color': '#31708f',
                    'fields': [
                        {
                            'title': 'From',
                            'value': outdatedPackage.wantedVersion,
                            'short': true
                        },
                        {
                            'title': 'To',
                            'value': outdatedPackage.latestVersion,
                            'short': true
                        },
                        {
                            'title': 'Branch',
                            'value': branchName,
                            'short': false
                        }
                    ]
                }
            ]
        };
        slack.sendSlackNotification(message);
    }
}
