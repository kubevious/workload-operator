import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { DeltaAction, KubernetesObject, ResourceAccessor } from "k8s-super-client";
import { ILogger } from "the-logger";
import { Context } from "../context";

export class K8sHandler
{
    private _context : Context;
    private _logger : ILogger;

    // private _changePackageClient : ResourceAccessor | null = null;
    // private _validationStateClient : ResourceAccessor | null = null;

    // private _retryJobs : Record<string, KubernetesObject> = {};

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("K8sHandler");
    }

    init()
    {
        this._logger.info("[init]...");

        if (!this._context.k8sClient) {
            this._logger.error("[K8sHandler] k8s Client Missing.");
            return;
        }

        // this._changePackageClient = this._context.k8sClient.client('ChangePackage', 'kubevious.io');
        // if (!this._changePackageClient) {
        //     this._logger.error("ChangePackage NOT PRESENT");
        //     return;
        // }

        // this._validationStateClient = this._context.k8sClient.client('ValidationState', 'kubevious.io');
        // if (!this._validationStateClient) {
        //     this._logger.error("ValidationState NOT PRESENT");
        //     return;
        // }

        // this._changePackageClient.watchAll(
        //     null,
        //     this._handleChangePackage.bind(this),
        //     () => {},
        //     () => {},
        //     );

        // this._context.backend.timerScheduler.interval(
        //     "guard-k8s-state-cleanup",
        //     GUARD_STATUS_CLEANUP_TIMER_INTERVAL_MS,
        //     this._processStatusCleanup.bind(this));

    }

    // private _handleChangePackage(action: DeltaAction, data: KubernetesObject)
    // {
    //     if (action === DeltaAction.Deleted) {
    //         return;
    //     }

    //     this._logger.info("[_handleChangePackage] %s :: %s", data.metadata.namespace, data.metadata.name);

    //     const charts : ChangePackageChart[] = 
    //         _.map((data.data as any).changes ?? [], x => ({
    //             namespace: x.namespace,
    //             name: x.name,
    //         }));

    //     const changes : KubernetesObject[] = 
    //         _.flatten(
    //             _.map((data.data as any).changes ?? [], (x: any) => {
    //                 const yamlData = unzip(x.data);
    //                 return yamlData as KubernetesObject[];
    //             })
    //         );    
            
    //     // this._logger.info("[_handleChangePackage] changes: ", changes);
            
    //     const deletions : ChangePackageDeletion[] = 
    //         _.map((data.data as any).deletions ?? [], x => ({
    //             apiVersion: x.apiVersion,
    //             kind: x.kind,
    //             namespace: x.namespace,
    //             name: x.name,
    //         }));

    //     const source : ChangePackageSource = {
    //         kind: 'k8s',
    //         name: data.metadata.name,
    //         namespace: data.metadata.namespace!,
    //     };

    //     const change: Partial<ChangePackageRow> = {
    //         change_id: `${source.kind}-${source.namespace}-${source.name}`,
    //         date: new Date(),
    //         source: source,
    //         summary: { 
    //             createdCount: changes.length,
    //             deletedCount: deletions.length,
    //         },
    //         charts: charts,
    //         changes: changes,
    //         deletions: deletions
    //     }

    //     Promise.resolve(null)
    //         .then(() => this._context.guardLogic.acceptChangePackage(change))
    //         .then(() => this._changePackageClient?.delete(data.metadata.namespace!, data.metadata.name))
    //         .catch(reason => {
    //             this._logger.error("[_handleChangePackage] Failed to process change package. Reason:", reason);

    //             this._scheduleProcessRetry(data);
    //         })
    //         .then(() => null)
    //         ;
        
    // }

    // private _scheduleProcessRetry(data: KubernetesObject)
    // {
    //     this._logger.warn("[_scheduleProcessRetry] Scheduling guard processing retry...");

    //     this._retryJobs[this._getGuardJobId(data)] = data; 

    //     if (!this._isRetryScheduled) {
    //         this._isRetryScheduled = true;

    //         this._context.backend.timerScheduler.timer(
    //             "guard-process-retry",
    //             GUARD_RETRY_TIMEOUT_MS,
    //             this._processRetryAll.bind(this));
    //     }
    // }

    // private _processRetryAll()
    // {
    //     this._logger.info("[_processRetryAll] Processing Start...");

    //     this._isRetryScheduled = false;

    //     return Promise.serial(_.keys(this._retryJobs), (jobId) => {
    //         const data = this._retryJobs[jobId];
    //         delete this._retryJobs[jobId];

    //         return Promise.resolve()
    //             .then(() => this._handleChangePackage(DeltaAction.Added, data));
    //     })
    //     .then(() => {
    //         this._logger.info("[_processRetryAll] Processing Completed.");
    //     })
    // }

    // private _getGuardJobId(data: KubernetesObject)
    // {
    //     return _.stableStringify({
    //         namespace: data.metadata.namespace ?? 'default',
    //         name: data.metadata.name
    //     });
    // }


    // public updateValidationState(namespace: string, name: string, statusObj: any)
    // {
    //     const body = {
    //         apiVersion: 'kubevious.io/v1',
    //         kind: 'ValidationState',
    //         metadata: {
    //             namespace: namespace,
    //             name: name,
    //         },
    //         status: statusObj
    //     }

    //     this._logger.info("[updateValidationState] %s :: %s => state: %s, success: %s", namespace, name, statusObj?.state, statusObj?.success);
    //     // this._logger.info("[updateValidationState] BEGIN obj: ", body);

    //     return this._validationStateClient!.query(body.metadata.namespace!, body.metadata.name!)
    //         .then(existingBody => {
    //             if (existingBody) {
    //                 existingBody.status = body.status;
    //                 return this._validationStateClient!.update(body.metadata.namespace!, body.metadata.name!, existingBody);
    //             } else {
    //                 return this._validationStateClient!.create(body.metadata.namespace!, body);
    //             }
    //         })
    // }

    // private _processStatusCleanup()
    // {
    //     return Promise.resolve()
    //         .then(() => this._validationStateClient!.queryAll())
    //         .then(statuses => {

    //             const toBeDeleted = statuses.filter(x => {
    //                 const state = (x.status as any)?.state as ValidationState;
    //                 if (state === ValidationState.completed || state === ValidationState.failed)
    //                 {
    //                     const dateStr = (x.status as any)?.date;
    //                     if (dateStr) {
    //                         const diffSec = DateUtils.diffSeconds(new Date(), dateStr);
    //                         if (diffSec > GUARD_STATUS_CLEANUP_TIMEOUT_SEC) {
    //                             return true;
    //                         }
    //                     }
    //                 }
    //                 return false;
    //             })

    //             this._logger.info("[_processStatusCleanup] toBeDeleted: %s", toBeDeleted.length);

    //             return Promise.serial(toBeDeleted, x => this._deleteValidationState(x));

    //         })
    // }

    // private _deleteValidationState(obj: KubernetesObject)
    // {
    //     this._logger.info("[_deleteValidationState] %s :: %s", obj.metadata.namespace!, obj.metadata.name!);
    //     return this._validationStateClient!.delete(obj.metadata.namespace!, obj.metadata.name!);
    // }
}