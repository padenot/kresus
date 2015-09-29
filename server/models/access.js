let log = require('printit')({
    prefix: 'models/access',
    date: true
});

import {module as americano} from '../db';
import {promisify, promisifyModel} from '../helpers';

let Access = americano.getModel('bankaccess', {
    bank: String,
    login: String,
    password: String,
    website: String
});

Access = promisifyModel(Access);

function allFromBank(bank, callback) {
    if (typeof bank !== 'object' || typeof bank.uuid !== 'string')
        log.warn("Access.allFromBank API misuse: bank is probably not an Bank object");

    let params = {
        key: bank.uuid
    };

    Access.request("allByBank", params, callback);
};
Access.allFromBank = promisify(Access::allFromBank);

function allLike(access, callback) {
    if (typeof access !== 'object' ||
        typeof access.bank !== 'string' ||
        typeof access.login !== 'string' ||
        typeof access.password !== 'string')
    {
        log.warn("Access.allLike API misuse: access is probably not an Access object");
    }

    let params = {
        key: [access.bank, access.login, access.password]
    };

    Access.request("allLike", params, callback);
}
Access.allLike = promisify(Access::allLike);

export default Access;

