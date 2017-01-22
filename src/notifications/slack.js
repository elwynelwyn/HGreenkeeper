'use strict';
module.exports = {
    sendSlackNotification
};

const IncomingWebhook = require('@slack/client').IncomingWebhook;
const winston = require('winston');
const deepExtend = require('deep-extend');

const config = require('../config');

function sendSlackNotification (msg) {
    const CONFIG = config.getConfig();
    return new Promise ((resolve, reject) => {
        if (!CONFIG.notifications.slackConfig.url) {
            winston.verbose(`Skipping Slack notification, because no URL is configured in the slackConfig.`);
            resolve();
            return
        }

        let webhook = new IncomingWebhook(CONFIG.notifications.slackConfig.url);

        let messageDefaults = {
            username: CONFIG.notifications.slackConfig.username,
            icon_emoji: CONFIG.notifications.slackConfig.icon_emoji
        };

        let message = deepExtend({}, messageDefaults, msg);

        webhook.send(message, function(err, response) {
            if (err) {
                winston.verbose(`Error sending Slack notification: `, err);
                reject(err);
            } else {
                winston.verbose('Slack notification sent. Got response: ', response);
                resolve();
            }
        });
    });
}

