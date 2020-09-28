export interface IReviveFromJSON {
    // Use this function to call EncodingUtils.attachPrototype on your sub objects
    // or reconstruct lost primitive types like Date or Timepoint
    reviveSubObjects(): void;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRevivable<T>(obj: Record<string, any>): obj is IReviveFromJSON {
    return "reviveSubObjects" in obj;
}

export default class EncodingUtils {
    // Use our own wrapper around JSON.stringify to control white space
    // eslint-disable-next-line @typescript-eslint/ban-types
    public static jsonify(obj: Object): string {
        return JSON.stringify(obj, null, 2);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static reviveObjectAs<T>(obj: Record<string, any>, constructorFunc: { new(...args: any[]): T}): void {
        if (obj instanceof Array) {
            for (const parsedElement of obj as T[]) {
                console.assert(!(parsedElement instanceof Array));
                this.reviveObjectAs(parsedElement, constructorFunc);
            }
        } else {
            Object.setPrototypeOf(obj, constructorFunc.prototype);
            const objAsT: T = obj as T;
            if (isRevivable(objAsT)) {
                objAsT.reviveSubObjects();
            }
        }
    }

    public static titleAsURL(title: string): string {
        // TODO: Makes links readable again
        return encodeURIComponent(title);
    }
    public static urlAsTitle(url: string): string {
        return decodeURIComponent(url);
    }
}
