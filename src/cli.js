#!/usr/bin/env node

const program = require('commander');
const winston = require('winston');

const packageJson = require('../package.json');
const server = require('./server');
const config = require('./config');
const notifications = require('./notifications');

let command;
program
    .version(packageJson.version)
    .option('--verbose', 'Enable verbose logging')
    .option('--silent', 'Supress all logging, even errors')
    .option('--config [configPath]', `Path to config file. Looks in root for "${config.DEFAULT_CONFIG_FILE_NAME}" by default.`);

program
    .command('serve')
    .alias('s')
    .description('Start the server, which will continuously watch for changes')
    .action(() => command = server.start);

program
    .parse(process.argv);

// Configure logging
winston.remove(winston.transports.Console);
if (program.silent) {
    winston.level = 'silent';
} else {
    winston.add(winston.transports.Console, {
        level: program.verbose ? 'verbose' : 'info',
        timestamp: true,
        colorize: true,
        timestamp: true
    });
    if (program.verbose) {
        winston.verbose('Verbose logging enabled.');
    }
}

config.loadConfig(program.config)
    .then(programConfig => {
        winston.verbose('Got config: ', programConfig);

        command
            ? command()
            : program.outputHelp();
    }).catch(winston.error);
