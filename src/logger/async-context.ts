import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
    requestId: string;
    logger?: any;
}

export const asyncStore = new AsyncLocalStorage<RequestContext>();