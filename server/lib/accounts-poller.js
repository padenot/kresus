import moment from 'moment';

import BankAccess    from "../models/access";
import Config        from "../models/kresusconfig";

import AccountManager from './accounts-manager';

let log = require('printit')({
    prefix: 'accounts-poller',
    date: true
});

class AccountsPoller
{
    start() {
        this.prepareNextCheck();
        this.timeout = null;
    }

    prepareNextCheck() {

        if (this.timeout !== null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        // day after between 02:00am and 04:00am UTC
        let delta = Math.random() * 120 | 0; // opa asm.js style
        let now = moment();
        let nextUpdate = now.clone().add(1, 'days')
                            .hours(2)
                            .minutes(delta)
                            .seconds(0);

        let format = "DD/MM/YYYY [at] HH:mm:ss";
        log.info(`> Next check of bank accounts on ${nextUpdate.format(format)}`);

        this.timeout = setTimeout(this.checkAllAccesses.bind(this), nextUpdate.diff(now));

    }

    async checkAllAccesses(callback) {
        try {
            log.info("Checking new operations for all bank accesses...");
            let accesses = await BankAccess.all();
            for (let access of accesses) {
                let accountManager = new AccountManager;
                await accountManager.retrieveOperationsByBankAccess(access, callback);
            }
            log.info("All accounts have been polled.");
            this.prepareNextCheck();
        } catch(err) {
            log.error(`Error when polling accounts: ${err.toString()}`);
        }
    }

    async runAtStartup(callback) {
        try {
            let found = await Config.byName('weboob-installed');
            if (!found || !found.value || found.value !== 'true')
                return;
            await accountPoller.checkAllAccesses(callback);
        } catch (err) {
            log.error(`Error when running account polling at startup: ${err.toString()}`);
        }
    }
};

let accountPoller = new AccountsPoller;

export default accountPoller;

