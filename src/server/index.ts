import Path from 'path';
import { ILogger } from 'the-logger';
import { Server } from '@kubevious/helper-backend';
import { Context } from '../context';

export interface Helpers 
{
}

export class WebServer
{
    private logger : ILogger;
    private server : Server<Context, Helpers>;
    private helpers : Helpers;

    constructor(context : Context)
    {
        this.logger = context.logger.sublogger('WebServer');
        this.helpers = {
        };

        this.server = new Server(this.logger, context, this.helpers, {
            routersDir: Path.join(__dirname, '..', 'routers')
        });
        this.server.initializer((app) => {
            app.set('trust proxy', true);
        })
    }

    get httpServer() {
        return this.server.httpServer;
    }

    get executionLimiter() {
        return this.server.executionLimiter
    }

    run() : Promise<Server<Context, Helpers>>
    {
        this.server.initializer(app => {

        })
        
        return this.server.run();
    }

}
