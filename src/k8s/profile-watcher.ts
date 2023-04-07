import _ from 'the-lodash';
import { DeltaAction, KubernetesObject } from "k8s-super-client";
import { Context } from "../context";
import { BaseWatcher } from './base-watcher';
import { KubeviousProfile } from '../types/profile';

export class ProfileWatcher extends BaseWatcher
{
    private _context : Context;

    constructor(context : Context)
    {
        super(context.logger.sublogger("ProfileWatcher"))
        this._context = context;
    }

    init()
    {
        super._initialize(this._handle.bind(this),
                          this._context.k8sClient?.client('WorkloadProfile', 'kubevious.io'));
    }

    private _handle(action: DeltaAction, data: KubernetesObject)
    {
        const profile = this._context.profileRegistry.fetch(data.metadata.namespace!,
            data.metadata.name);

        if (action === DeltaAction.Deleted)
        {
            profile.remove();
        }
        else
        {
            profile.setupConfig(_.cloneDeep(data) as KubeviousProfile);
        }
    }

}