import { Request, Response } from "express";
import { HTTPVerb } from "../logic/HTTPVerb";

export type RouteCallback = (request: Request, response: Response) => Promise<void>;

export default class RouteInfo {
    public path!: string;
    public verb!: HTTPVerb;
    public requiresAuthentication!: boolean;
    public callback!: RouteCallback;
}

export type AuthRouteCallback = (request: Request, response: Response, next: Function) => Promise<void>;
export class AuthRouteInfo {
    public path!: string;
    public verb!: HTTPVerb;
    public callback!: AuthRouteCallback;
}
