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

    // Converts the given value in a percentage between the current rangeStart and rangeEnd, clamped in [0;100]
    public static normalize(value: number, rangeStart: number, rangeEnd: number): number {
        const percentage = 100 * (value - rangeStart) / (rangeEnd - rangeStart);
        const normalized = MathHelpers.clamp(percentage, 0, 100);
        return normalized;
    }
}
