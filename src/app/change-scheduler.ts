import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { Context } from '../context';
import { Workload } from './workload';
import { MyPromise } from 'the-promise/dist';
import { WorkloadController } from './workload-controller';

export class ChangeScheduler
{
    private _context: Context;
    private _logger : ILogger;
    private _workloads: Record<string, Workload> = {};
    private _queue: Workload[] = [];
    private _isScheduled = false;

    constructor(context: Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("ChangeScheduler");
    }

    public schedule(workload: Workload)
    {
        if (!this._workloads[workload.key])
        {
            this._workloads[workload.key] = workload;
            this._queue.push(workload);
            this._trigger();
        }
    }

    private _trigger()
    {
        if (this._isScheduled) {
            return;
        }

        if (_.keys(this._workloads).length === 0) {
            return;
        }

        this._isScheduled = true;

        Promise.resolve(null)
            .then(() => MyPromise.delay(2000))
            .then(() => {
                this._isScheduled = false;
                this._processAll();
            })
            .catch((reason) => {
                this._logger.error("Error processing. ", reason);
                this._trigger();
            })
    }

    private async _processAll()
    {
        this._logger.info(">>>>>> [_processAll] begin. count: %s", this._queue.length);

        const queue = this._queue;
        this._queue = [];
        this._workloads = {};

        await MyPromise.serial(queue, x => this._processSingle(x));

        this._logger.info(">>>>>> [_processAll] end. count: %s", this._queue.length);
    }

    private async _processSingle(workload: Workload)
    {
        this._logger.info(">>>>>> [_processSingle] %s", workload.key);

        const controller = new WorkloadController(this._context, workload);
        return controller.apply();
    }

}
