# HGreenkeeper
Helps you keep npm dependencies up to date in your Mercurial / hg repository

```
npm install hgreenkeeper -g
hgreenkeeper --help
```

## How it works
HGreenkeeper runs a small server. This looks at your repo for a `package.json`, and periodically runs `npm outdated` to see if you have any dependencies that are not at latest.

When it finds a dependency that is out of date, it creates a branch, updates the version number in `package.json`, and pushes it.

## Recommended setup
HGreenkeeper runs commands on your repository. As such, I'd suggest you have separate clones of your repo(s) which HGreenkeeper can run against.

First, install HGreenkeeper globally:

`npm install hgreenkeeper -g`

Next, create a new directory where you want to run HGreenkeeper from (and probably where you will keep your extra repository clones):

`mkdir hgreenkeeper`

Clone your repos inside this folder:

`cd ./hgreenkeeper`

`hg clone https://example.com/example-repo-1`

`hg clone https://example.com/example-repo-2`

Next, create a config file in the folder root for HGreenkeeper.

By default HGreenkeeper looks for a file named `hgreenkeeper.config.js`.

```
module.exports = {
    projects: [
        {
            path: './example-repo-1'
        },
        {
            path: './example-repo-2'
        }
    ]
}
```
See below for more configuration options.

Now start the HGreenkeeper server, which will start doing it's thang.

`hgreenkeeper serve`

The server also provides a web-console to provide you with HGreenkeeper status.

Use a tool like [forever](https://github.com/foreverjs/forever) or [pm2](https://github.com/Unitech/pm2) to keep this process alive.

### Authentication
Unfortunately you cannot (yet?) easily setup authentication (e.g. for Mercurial) with HGreenkeeper. It just runs commands and expects to already be logged in - so commits will show up as the currently authenticated Mercurial user.

## Config

By default HGreenkeeper looks inside the directory you run it in for a file names `hgreenkeeper.config.js`.

You can alternatively use `--config ../path/to/your/config.js`.

An example config (with the default values):

```
'use strict';

module.exports = {
    // port that the web-server runs from
    port: 4321,
    
    // The frequency that HGreenkeeper will hg pull, and run `npm outdated`
    pollInterval: 600000, // 10 mins
    
    hg: {
        // The format HGreenkeeper will use when creating new branches. Also supports the {wantedVersion} token (which is the old version you have set in package.json)
        branchFormat: 'hgreenkeeper-{packageName}-{latestVersion}',
        
        // The format HGreenkeeper will use when commiting changes.
        commitFormat: 'hgreenkeeper updated {packageName} from {wantedVersion} to {latestVersion}.'
    },
    
    projects: [
        // Name of the project. Only used for logging, and the web-status-page. If ommitted, HGreenkeeper will use the 'name' field from package.json
        name: 'Your cool project',
        
        // (relative) path to your repository. This is converted into the fullPath based on the CWD you run HGreenkeeper in
        path: './example-repo-1',
        
        (optional) - the absolute path to the project repo. If omitted, calculated from the relative path.
        fullPath: 'C:\\data\\hgreenkeeper\\example-repo-1'
    ],
    
    notifications: {
        // Currently only Slack is supported
        slackConfig: {
        
            // In Slack, create an Incoming Web Hook, and paste the URL it gives you here
            url: 'https://hooks.slack.com/services/ABC123/FGFGFGFGFG/QWERTYQWERTYQWERTYQWERTYQWERTY',
            
            // The name of the Slack bot messages will come from
            username: 'HGreenkeeper',
            
            // Sunflowers are rad
            icon_emoji: ':sunflower:'
        },
        
        // Notify when a package update branch has been created
        onBranchCreated: true,
        
        // Notify when HGreenkeeper finds the repo with uncommitted changes, which prevents it from running.
        onUncommittedChanges: true
    },
    
    // optional path for the JSON file that tracks pending updates
    pendingUpdatespath: './hgreenkeeper.pending.json',    
    
    // optional issue tracker integration. See notes below
    issueTracker: './hgreenkeeper.jira.js'
}
```

HGreenkeeper can be run with the `--verbose` flag to provide lots of logging.

Alternatively, you can use `--silent` to suppress all output (even errors!);

## Issue tracker integration

TODO write docs for this

## FAQ

*Hypothetical FAQs, no one has actually asked questions yet...*

**Is this affiliated with [Greenkeeper](https://greenkeeper.io/)?**

No. This project exists to provide similar functionality to their awesome product, for those of use using Mercurial / hg.

**I use git, can I use HGreenkeeper?**

No, use [Greenkeeper](https://greenkeeper.io/). It's way better.

**Will this wipe my uncommitted changes?**

No, it runs `hg status` and bails out from doing any changes if there are uncommitted changes.

However I keep a separate clone of my repository specifically for HGreenkeeper, so I haven't extensively tested with a repository that is actively being worked on.

**Does it support yarn?**

Yes, it tries to detect if `yarn` is available on your path, and if so runs all commands through `yarn` instead of `npm`.

If it sees a `yarn.lock` file it will also run a `yarn` install after bumping your `package.json` versions so that the lock file is up to date.

## Future plans
Better notifications

CI integration (first up, TeamCity)

Hooks (e.g. to allow creating a Jira issue for a dependency update branch)
