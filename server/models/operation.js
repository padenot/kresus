let log = require('printit')({
    prefix: 'models/operations',
    date: true
});

import {module as americano} from '../db';
import {promisify, promisifyModel} from '../helpers';

// Whenever you're adding something to the model, don't forget to add it to this
// list if it should be transferred when merging duplicates.
// Also, this should be kept in sync with the merging of operations on the
// client side.
let FieldsToTransferUponMerge = ['categoryId', 'operationTypeID', 'binary', 'attachments'];

let Operation = americano.getModel('bankoperation', {
    bankAccount: String,         // actually the account number as in the bank, not as in the data-system
    title: String,
    date: Date,
    amount: Number,
    raw: String,
    dateImport: Date,
    categoryId: String,
    attachments: Object,         // {linkTranslationKey: String, linkPlainEnglish: String, url: String}
    operationTypeID: String,
    // Binary is an object containing one field (file) that links to a binary
    // document via an id. The binary document has a binary file
    // as attachment.
    binary: function(x) { return x; }
});

Operation = promisifyModel(Operation);

Operation.FieldsToTransferUponMerge = FieldsToTransferUponMerge;

function allFromBankAccount(account, callback) {
    if (typeof account !== 'object' || typeof account.accountNumber !== 'string')
        log.warn("Operation.allFromBankAccount API misuse: account is probably not an Account");

    let params = {
        key: account.accountNumber
    };

    Operation.request("allByBankAccount", params, callback);
}
Operation.allFromBankAccount = promisify(Operation::allFromBankAccount)

function allFromBankAccounts(accountNums, callback) {
    if (!(accountNums instanceof Array))
        log.warn("Operation.allFromBankAccounts API misuse: accountNums isn't an array");

    let params = {
        keys: accountNums
    };

    Operation.request("allByBankAccount", params, callback);
}
Operation.allFromBankAccounts = promisify(Operation::allFromBankAccounts);

function allFromBankAccountDate(account, callback) {
    if (typeof account !== 'object' || typeof account.accountNumber !== 'string')
        log.warn("Operation.allFromBankAccountDate API misuse: account is probably not an Account");

    let params = {
        startkey: [account.accountNumber + "0"],
        endkey: [account.accountNumber],
        descending: true
    };

    Operation.request("allByBankAccountAndDate", params, callback);
}
Operation.allFromBankAccountDate = promisify(Operation::allFromBankAccountDate);

function allLike(operation, callback) {
    if (typeof operation !== 'object')
        log.warn("Operation.allLike API misuse: operation isn't an object");

    let date = new Date(operation.date).toISOString();
    let amount = (+operation.amount).toFixed(2);
    let params = {
        key: [operation.bankAccount, date, amount, operation.raw]
    };

    Operation.request("allLike", params, callback);
}
Operation.allLike = promisify(Operation::allLike);

function destroyByAccount(accountNum, callback) {
    if (typeof accountNum !== 'string')
        log.warn("Operation.destroyByAccount API misuse: accountNum isn't a string");

    let params = {
        key: accountNum,
        limit: 9999999 // https://github.com/cozy/cozy-db/issues/41
    };

    Operation.requestDestroy("allByBankAccount", params, callback);
}
Operation.destroyByAccount = promisify(Operation::destroyByAccount);

function allByCategory(categoryId, callback) {
    if (typeof categoryId !== 'string')
        log.warn(`allByCategory API misuse: ${categoryId}`);

    let params = {
        key: categoryId
    };

    Operation.request("allByCategory", params, callback);
}
Operation.allByCategory = promisify(Operation::allByCategory);

export default Operation;
