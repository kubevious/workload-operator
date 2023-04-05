import _ from 'the-lodash';

import * as crypto from "crypto";
// const crypto = require('crypto');

export class HashUtils
{
    static calculateObjectHash(obj : any) : Buffer
    {
        if (_.isNullOrUndefined(obj)) {
            throw new Error('NO Object');
        }

        const str = _.stableStringify(obj);

        const sha256 = crypto.createHash('sha256');
        sha256.update(str);
        const value = <Buffer> sha256.digest();
        return value;
    }

    static calculateObjectHashStr(obj : any) : string
    {
        return HashUtils.calculateObjectHash(obj).toString('hex');
    }

}