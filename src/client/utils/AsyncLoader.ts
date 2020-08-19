import { HTTPVerb } from '@/logic/HTTPVerb';
import { IReviveFromJSON, isRevivable } from "../../logic/EncodingUtils";

interface Constructable<T> {
    new (): T;
}

export default class AsyncLoader {
    public static async fetchTextFile(url: string): Promise<string> {
        const xhr = new XMLHttpRequest();

        const promise = new Promise<string>((resolve, reject) => {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(xhr.status);
                    }
                }
            };
        });

        xhr.open("GET", url, true);
        xhr.send();
        return promise;
    }

    public static async makeRestRequest<TBody, TResult>(
        url: string, verb: HTTPVerb, body: TBody,
        resultType: Constructable<TResult>): Promise<TResult|TResult[]> {

        const xhr = new XMLHttpRequest();

        const promise = new Promise<TResult>((resolve, reject) => {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        const parsedObject: Object = JSON.parse(xhr.responseText);
                        const instancedResult: TResult|TResult[] = AsyncLoader.attachPrototypeToObject(resultType, parsedObject);
                        // This shouldn't need a cast but it does need one
                        // Since this looks like a bug in TS-compiler, we'll just silently ignore the error
                        resolve(instancedResult as TResult);
                    } else {
                        reject(xhr.status);
                    }
                }
            };
        });

        xhr.open(verb, url, true);
        xhr.send();
        return promise;
    }

    private static attachPrototypeToObject<T>(prototype: Constructable<T>, parsedObject: Object): T|T[] {
        // If the result is an array, recurse for every element of the array
        if (parsedObject instanceof Array) {
            for (let parsedElement of parsedObject as T[]) {
                console.assert(!(parsedElement instanceof Array));
                this.attachPrototypeToObject(prototype, parsedElement);
            }
            return parsedObject;
        }
        else {
            (parsedObject as any).__proto__ = prototype.prototype;
            const objAsT = parsedObject as T;
            if (isRevivable(objAsT)) {
                objAsT.attachSubObjectPrototypes();
            }
            return objAsT;
        }
    }
}
