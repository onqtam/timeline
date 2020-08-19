import { Request, Response } from "express";
import { HTTPVerb } from '../logic/HTTPVerb';

export type RouteCallback = (request: Request, response: Response) => Promise<void>;

export default class RouteInfo {
    public path!: string;
    public verb!: HTTPVerb;
    public callback!: RouteCallback;
}
