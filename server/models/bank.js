let log = require('printit')({
    prefix: 'models/bank',
    date: true
});

import {module as americano} from '../db';
import {promisify, promisifyModel} from '../helpers';

import Account from './account';

let Bank = americano.getModel('bank', {
    name: String,
    uuid: String,
    // TODO websites shouldn't be saved in memory
    websites: function(x) { return x }
});

Bank = promisifyModel(Bank);

function createOrUpdate(bank, callback) {

    if (typeof bank !== 'object' || typeof bank.uuid !== 'string')
        log.warn("Bank.createOrUpdate API misuse: bank is probably not an instance of Bank");

    let params = {
        key: bank.uuid
    };

    Bank.request("byUuid", params, (err, found) => {
        if (err)
            return callback(err);

        if (found && found.length) {
            if (found.length !== 1) {
                log.error(`More than one bank with uuid ${bank.uuid}!`);
                return callback('Duplicate bank');
            }

            found = found[0];

            if (found.uuid === bank.uuid && found.name === bank.name) {
                log.info(`${found.name} information already up to date.`);
                return callback();
            }

            log.info(`Updating attributes of bank with uuid ${bank.uuid}...`);
            found.updateAttributes({
                uuid: bank.uuid,
                name: bank.name
            }, callback);
            return;
        }

        log.info(`Creating bank with uuid ${bank.uuid}...`);
        Bank.nopromises.create.call(Bank, bank, callback);
    });
}
Bank.createOrUpdate = promisify(Bank::createOrUpdate);

function getBanksWithAccounts(callback) {
    let params = {
        group: true
    };

    Account.rawRequest('bankWithAccounts', params, (err, banks) => {
        if (err)
            return callback(err, null);

        if (!banks)
            return callback(null, []);

        let uuids = banks.map(bank => bank.key);
        let params = {
            keys: uuids
        };
        Bank.request("byUuid", params, callback);
    });
}
Bank.getBanksWithAccounts = promisify(Bank::getBanksWithAccounts);

export default Bank;
