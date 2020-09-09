import { HTTPVerb } from '@/logic/HTTPVerb';
import EncodingUtils, { IReviveFromJSON, isRevivable } from "../../logic/EncodingUtils";
import store from '../store';

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

    public static async makeRestRequest<TResult, TBody>(
        url: string, verb: HTTPVerb, body: TBody,
        resultType?: Constructable<TResult>): Promise<TResult|TResult[]> {

        const xhr = new XMLHttpRequest();

        const promise = new Promise<TResult>((resolve, reject) => {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        if (xhr.responseText.length !== 0) {
                            const parsedObject: Object = JSON.parse(xhr.responseText);
                            if (resultType) {
                                EncodingUtils.reviveObjectAs(parsedObject, resultType);
                            }
                            resolve(parsedObject as TResult);
                        } else {
                            resolve();
                        }
                    } else {
                        reject(xhr.status);
                    }
                }
            };
        });
        xhr.open(verb, url, true);

        xhr.setRequestHeader("Content-Type", "application/json");
        if (store.state.user.isAuthenticated) {
            xhr.setRequestHeader("Timeline-User-Id", store.state.user.info.id.toString());
        }

        xhr.send(JSON.stringify(body));
        return promise;
    }
}
