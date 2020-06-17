export default class MathHelpers {
    public static isBetween(value: number, min: number, max: number) {
        return value >= min && value <= max;
    };
    public static isInBucket(value: number, firstBucketStart: number, bucketSize: number, currentBucketIndex: number) {
        const bucketStart = firstBucketStart + currentBucketIndex * bucketSize;
        const bucketEnd = bucketStart + bucketSize;
        return MathHelpers.isBetween(value, bucketStart, bucketEnd);
    };
}
