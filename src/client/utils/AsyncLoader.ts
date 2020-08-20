import { HTTPVerb } from '@/logic/HTTPVerb';
import EncodingUtils, { IReviveFromJSON, isRevivable } from "../../logic/EncodingUtils";

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
                        EncodingUtils.reviveObjectAs(parsedObject, resultType);
                        resolve(parsedObject as TResult);
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
}
