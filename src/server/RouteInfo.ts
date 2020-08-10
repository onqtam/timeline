import { Request, Response } from "express";

export enum HTTPVerb {
    Get = "get",
    Post = "post",
    Put = "put",
    Delete = "delete"
}

export type RouteCallback = (request: Request, response: Response) => Promise<void>;

export default class RouteInfo {
    public path!: string;
    public verb!: HTTPVerb;
    public callback!: RouteCallback;
}
