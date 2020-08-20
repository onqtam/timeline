export interface IReviveFromJSON {
    // Use this function to call EncodingUtils.attachPrototype on your sub objects
    // or reconstruct lost primitive types like Date or Timepoint
    reviveSubObjects(): void;
}

export function isRevivable<T>(obj: Object): obj is IReviveFromJSON {
    return "reviveSubObjects" in obj;
}

export default class EncodingUtils {
    // Use our own wrapper around JSON.stringify to control white space
    // eslint-disable-next-line @typescript-eslint/ban-types
    public static jsonify(obj: Object): string {
        return JSON.stringify(obj, null, 2);
    }

    public static reviveObjectAs<T>(obj: Object, constructorFunc: { new(...args: any[]): T}): void {
        if (obj instanceof Array) {
            for (let parsedElement of obj as T[]) {
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
}
