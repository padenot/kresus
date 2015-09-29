let log = require('printit')({
    prefix: 'models/config',
    date: true
});

import {module as americano} from '../db';
import {promisify, promisifyModel} from '../helpers';

let Config = americano.getModel('kresusconfig', {
    name: String,
    value: String
});

Config = promisifyModel(Config);

function byName(name, cb) {
    if (typeof name !== 'string')
        log.warn("Config.byName API misuse: name isn't a string");

    let param = {
        key: name
    };

    Config.request('byName', param, (err, founds) => {
        if (err)
            return cb(err);

        if (founds && founds.length)
            return cb(null, founds[0]);

        cb(null, null);
    });
}
Config.byName = promisify(Config::byName);

function findOrCreateByName(name, defaultValue, cb) {
    Config.request('byName', {key: name}, (err, found) => {

        if (err)
            return cb(`Error when reading setting ${name}: ${err}`);

        if (!found || !found.length) {
            let pair = {
                name,
                value: defaultValue
            }

            // TODO enhance this call
            Config.nopromises.create.call(Config, pair, (err, pair) => {
                if (err)
                    return cb(`Error when creating setting ${name}: ${err}`);
                cb(null, pair);
            });
            return;
        }

        cb(null, found[0]);
    });
}
Config.findOrCreateByName = promisify(Config::findOrCreateByName);

export default Config;
