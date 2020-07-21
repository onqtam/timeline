export default class MathHelpers {
    public static isBetween(value: number, min: number, max: number) {
        return value >= min && value <= max;
    };
    public static isBetweenOpenEnded(value: number, min: number, max: number) {
        return value >= min && value < max;
    };
    public static isInBucket(value: number, firstBucketStart: number, bucketSize: number, currentBucketIndex: number): boolean {
        const bucketStart = firstBucketStart + currentBucketIndex * bucketSize;
        const bucketEnd = bucketStart + bucketSize;
        return MathHelpers.isBetween(value, bucketStart, bucketEnd);
    };
    public static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    };
    public static randInRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }
    public static percentageOfRange(value: number, min: number, max: number): number {
        return (value - min) / (max - min);
    }
}
