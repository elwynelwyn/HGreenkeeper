'use strict';
module.exports = {
    start: startServer
};

const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const figlet = require('figlet');
const path = require('path');

const notifications = require('../notifications');
const config = require('../config');
const checker = require('../checker');
const utils = require('../utils');
const hg = require('../hg');
const pending = require('../pending');

// mock TC webhook POST for testing purposes
let dummyTeamCityWebhook;

function startServer () {
    const CONFIG = config.getConfig();
    const app = express();
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(express.static(path.join(__dirname, '/www')));

    app.post('build-status', (request, response) => {
        // request.body
        let buildStatus = {
            status: dummyTeamCityWebhook.build.status,
            branch: dummyTeamCityWebhook.build.scm.branch
        };
        onBuildStatusReport(buildStatus);
        response.send('ok');
    });

    app.get('/pending.json', (request, response) => {
        winston.verbose(`Request for pending.json`);
        pending.getPending()
            .then(pending => {
                response.type('json');
                response.send(pending);
            })
            .catch(err => {
                response.status(500, {
                    error: err
                });
            });
    });

    app.listen(CONFIG.port, () => {
        figlet('HGreenkeeper', (err, data) => {
            let welcomeMsg = '\r\n';
            if (!err) {
                welcomeMsg += data + '\r\n\r\n ';
            }
            welcomeMsg += `HGreenkeeper is listening on port ${CONFIG.port}\r\n\r\n`;
            winston.info(welcomeMsg);

            startOutdatedPackageChecker();
        });
    });
}

function startOutdatedPackageChecker () {
    const CONFIG = config.getConfig();

    winston.verbose('Running initial hg pull');
    let pollPromise = onPollForRepoChanges()
        .then(() => {
            winston.verbose('Running initial check for outdated packages');
            return onPollForOutdatedPackages();
        });
    pollPromise.then(() => {
        winston.verbose('Initial poll done!');

        setInterval(() => {
            pollPromise.then(() => {
                pollPromise = onPollForRepoChanges()
                    .then(() => onPollForOutdatedPackages());
            });
        }, CONFIG.pollInterval);
        winston.info(`Polling "hg pull" and "npm outdated" every ${CONFIG.pollInterval}...`);
    });
}

function onBuildStatusReport (buildStatus) {
    console.log('TODO: got build status report:\n', buildStatus);
}

function onPollForRepoChanges () {
    const CONFIG = config.getConfig();

    let tasks = CONFIG.projects.map(project => {
        return () => {
            return hg.pullU(project.fullPath);
        }
    });

    return utils.promiseSequence(tasks)
        .then(() => winston.info('Done!'))
        .catch(winston.error);
}

function onPollForOutdatedPackages () {
    const CONFIG = config.getConfig();

    let tasks = CONFIG.projects.map(project => {
        return () => {
            return checker.runOutdatedCheckerForProject(project);
        }
    });

    return utils.promiseSequence(tasks)
        .then(() => winston.info('Done!'))
        .catch(winston.error);
}

dummyTeamCityWebhook = {
    "name": "Echo :: Build",
    "url": "http://127.0.0.1:8080/viewType.html?buildTypeId=Echo_Build",
    "build": {
        "full_url": "http://127.0.0.1:8080/viewLog.html?buildTypeId=Echo_Build&buildId=14",
        "build_id": "7",
        "status": "success",
        "scm": {
            "url": "https://github.com/evgeny-goldin/echo-service.git",
            "branch": "origin/master",
            "commit": "6bef6af1f43fb3e5e6d73f1e3332e82dae1f55d4"
        },
        "artifacts": {
            "echo-service-0.0.1-SNAPSHOT.jar": {
                "s3": "https://s3-eu-west-1.amazonaws.com/evgenyg-bakery/Echo::Build/7/echo-service-0.0.1-SNAPSHOT.jar",
                "archive": "http://127.0.0.1:8080/repository/download/Echo_Build/7/echo-service-0.0.1-SNAPSHOT.jar"
            }
        }
    }
};
