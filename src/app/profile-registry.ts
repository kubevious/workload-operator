import { ILogger } from "the-logger";
import { Context } from "../context";
import { Profile } from "./profile";

export class ProfileRegistry
{
    private _context : Context;
    private _logger : ILogger;
    private _profileLogger : ILogger;
    private _dict : Record<string, Profile> = {};

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("ProfileRegistry");
        this._profileLogger = context.logger.sublogger("Profile");
    }

    fetch(ns: string, name: string)
    {
        const key = makeKey(ns, name);
        let profile = this._dict[key];
        if (profile) {
            return profile;
        }

        profile = new Profile(this._context, this._profileLogger, key, ns, name);
        this._dict[key] = profile;
        return profile;
    }

    find(ns: string, name: string)
    {
        const key = makeKey(ns, name);
        const profile = this._dict[key];
        return profile ?? null;
    }

    remove(profile: Profile)
    {
        this._logger.info("[remove] %s", profile.key);
        delete this._dict[profile.key];
    }
}

function makeKey(ns: string, name: string)
{
    return `${ns}_${name}`;
}