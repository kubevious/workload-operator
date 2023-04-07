import { ILogger } from "the-logger";
import { Context } from "../context";
import { Workload } from "./workload";

export class WorkloadRegistry
{
    private _context : Context;
    private _logger : ILogger;
    private _workloadLogger : ILogger;
    private _dict : Record<string, Workload> = {};

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("WorkloadRegistry");
        this._workloadLogger = context.logger.sublogger("Workload");
    }

    fetch(ns: string, name: string)
    {
        const key = makeKey(ns, name);
        let workload = this._dict[key];
        if (workload) {
            return workload;
        }

        workload = new Workload(this._context, this._workloadLogger, key, ns, name);
        this._dict[key] = workload;
        return workload;
    }

    remove(workload: Workload)
    {
        this._logger.info("[remove] %s", workload.key);
        delete this._dict[workload.key];
    }
}

function makeKey(ns: string, name: string)
{
    return `${ns}_${name}`;
}