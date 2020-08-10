export default class EncodingUtils {
    // Use our own wrapper around JSON.stringify to control white space
    // eslint-disable-next-line @typescript-eslint/ban-types
    public static jsonify(obj: Object): string {
        return JSON.stringify(obj, null, 2);
    }
}
