export interface IReviveFromJSON {
    attachSubObjectPrototypes(): void;
}


export default class EncodingUtils {
    // Use our own wrapper around JSON.stringify to control white space
    // eslint-disable-next-line @typescript-eslint/ban-types
    public static jsonify(obj: Object): string {
        return JSON.stringify(obj, null, 2);
    }

    public static attachPrototype<T>(obj: Object, constructorFunc: { new(...args: any[]): T}): void {
        (obj as any).__proto__ = constructorFunc.prototype;
    }
}
