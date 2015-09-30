import Bank          from '../models/bank';
import Access        from '../models/access';
import Account       from '../models/account';
import Category      from '../models/category';
import Operation     from '../models/operation';
import OperationType from '../models/operationtype';
import Config        from '../models/kresusconfig';
import Cozy          from '../models/cozyinstance';

import {sendErr, asyncErr} from '../helpers';

let log = require('printit')({
    prefix: 'controllers/all',
    date: true
})

const ERR_MSG_LOADING_ALL = 'Error when loading all Kresus data';

async function GetAllData() {
    let ret = {};
    ret.banks = await Bank.all();
    ret.accounts = await Account.all();
    ret.operations = await Operation.all();
    ret.operationtypes = await OperationType.all();
    ret.categories = await Category.all();
    ret.settings = await Config.all();
    ret.cozy = await Cozy.all();
    return ret;
}

export async function all(req, res) {
    try {
        let ret = await GetAllData();
        res.status(200).send(ret);
    } catch(err) {
        err.code = ERR_MSG_LOADING_ALL;
        return asyncErr(res, err, "when loading all data");
    }
}

// Sync function
function CleanData(all) {

    // Bank information is static and shouldn't be exported.
    delete all.banks;

    // Cozy information is very tied to the instance.
    if (all.cozy)
        delete all.cozy;

    let accessMap = {};
    let nextAccessId = 0;

    all.accesses = all.accesses || [];
    for (let a of all.accesses) {
        accessMap[a.id] = nextAccessId;
        a.id = nextAccessId++;
        // Strip away password
        a.password = undefined;
    }

    all.accounts = all.accounts || [];
    for (let a of all.accounts) {
        a.bankAccess = accessMap[a.bankAccess];
        // Strip away id
        a.id = undefined;
    }

    let categoryMap = {};
    let nextCatId = 0;
    all.categories = all.categories || [];
    for (let c of all.categories) {
        categoryMap[c.id] = nextCatId;
        c.id = nextCatId++;
    }

    let opTypeMap = {};
    let nextOpTypeId = 0;
    all.operationtypes = all.operationtypes || [];
    for (let o of all.operationtypes) {
        opTypeMap[o.id] = nextOpTypeId;
        o.id = nextOpTypeId++;
    }

    all.operations = all.operations || [];
    for (let o of all.operations) {

        if (typeof o.categoryId !== 'undefined') {
            let cid = o.categoryId;
            if (+cid === -1) // None category
                o.categoryId = undefined;
            else if (typeof categoryMap[cid] === 'undefined')
                log.warn(`unexpected category id: ${cid}`);
            else
                o.categoryId = categoryMap[cid];
        }

        if (typeof o.operationTypeID !== 'undefined') {
            let oid = o.operationTypeID;
            if (typeof opTypeMap[oid] === 'undefined')
                log.warn(`unexpected operation type id: ${oid}`);
            else
                o.operationTypeID = opTypeMap[oid];
        }

        // Strip away id
        o.id = undefined;
    }

    all.settings = all.settings || [];
    all.settings = all.settings.filter(s => ['weboob-log', 'weboob-installed'].indexOf(s.name) === -1);
    for (let s of all.settings) {
        s.id = undefined;
    }
    return all;
}


module.exports.export = async function(req, res) {
    try {
        let ret = await GetAllData();
        ret.accesses = await Access.all();
        ret = CleanData(ret);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(ret, null, '   '));
    } catch (err) {
        err.code = ERR_MSG_LOADING_ALL;
        return asyncErr(res, err, "when exporting data");
    }
}

module.exports.import = async function(req, res) {
    if (!req.body.all)
         return sendErr(res, "missing parameter all", 400, "missing parameter 'all' in the file");

    let all = req.body.all;
    all.accesses       = all.accesses       || [];
    all.accounts       = all.accounts       || [];
    all.categories     = all.categories     || [];
    all.operationtypes = all.operationtypes || [];
    all.operations     = all.operations     || [];
    all.settings       = all.settings       || [];

    try {
        log.info(`Importing:
            accesses:        ${all.accesses.length}
            accounts:        ${all.accounts.length}
            categories:      ${all.categories.length}
            operation-types: ${all.operationtypes.length}
            settings:        ${all.settings.length}
            operations:      ${all.operations.length}
        `);

        let accessMap = {};
        for (let access of all.accesses) {
            let accessId = access.id;
            access.id = undefined;
            let created = await Access.create(access);
            accessMap[accessId] = created.id;
        }

        for (let account of all.accounts) {
            if (!accessMap[account.bankAccess]) {
                throw { status: 400, message: `unknown bank access ${account.bankAccess}` }
            }
            account.bankAccess = accessMap[account.bankAccess];
            await Account.create(account);
        }

        let categoryMap = {};
        for (let category of all.categories) {
            let catId = category.id;
            category.id = undefined;
            let created = await Category.create(category);
            categoryMap[catId] = created.id;
        }

        let opTypeMap = {};
        for (let type of all.operationtypes) {
            let opTypeId = type.id;
            type.id = undefined;
            let created = await OperationType.create(type);
            opTypeMap[opTypeId] = created.id;
        }

        for (let op of all.operations) {
            if (typeof op.categoryId !== 'undefined') {
                if (!categoryMap[op.categoryId]) {
                    throw { status: 400, message: `unknown category ${op.categoryId}` };
                }
                op.categoryId = categoryMap[op.categoryId];
            }
            if (typeof op.operationTypeID !== 'undefined') {
                if (!opTypeMap[op.operationTypeID]) {
                    throw { status: 400, message: `unknown operation type ${op.categoryId}` };
                }
                op.operationTypeID = opTypeMap[op.operationTypeID];
            }
            await Operation.create(op);
        }

        for (let setting of all.settings) {
            await Config.create(setting);
        }

        log.info("Import finished with success!");
        res.sendStatus(200);
    } catch (err) {
        return asyncErr(res, err, "when importing data");
    }
}

