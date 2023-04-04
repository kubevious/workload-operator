import _ from 'the-lodash';
import { MyPromise, Resolvable } from 'the-promise';
import { ILogger } from 'the-logger';

export type DataFetcherHandler<T> = (target: HasKind) => Resolvable<T> | null;

export class DataFetcher
{
    private _logger: ILogger;
    private _handlers: Record<string, DataFetcherHandler<any>> = {};
    
    constructor(logger: ILogger)
    {
        this._logger = logger.sublogger('DataFetcher');
    }

    register<T = any>(kind: string, handler: DataFetcherHandler<T>)
    {
        this._handlers[kind] = handler;
    }

    resolve<T = any>(target: HasKind) : Promise<T | null>
    {
        const handler = this._handlers[target.kind];
        if (!handler) {
            return Promise.resolve(null);
        }
        return MyPromise.try(() => handler(target))
            .then(result => {
                return <T>result;
            })
    }
}

export interface HasKind
{
    kind: string
}
