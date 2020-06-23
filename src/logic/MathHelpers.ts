export class RandomIntegerDistribution {
    private distributionArray: number[];

    constructor(values: number[], weights: number[]) {
        console.assert(values.length === weights.length);
        console.assert(weights.reduce((w, sum) => sum + w, 0) === 1);
        const SAMPLE_COUNT = 100;
        const fillArrayWithValue = (value: number, index: number) => Array(~~(SAMPLE_COUNT * weights[index])).fill(value);
        this.distributionArray = values.flatMap(fillArrayWithValue);
    }

    public sample(): number {
        return this.distributionArray[~~(Math.random() * this.distributionArray.length)];
    }
}
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
