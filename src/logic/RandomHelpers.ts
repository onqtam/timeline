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

export class RandomString {
    private static LOREM_IPSUM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ac velit neque. Pellentesque mattis velit arcu, eget pharetra arcu finibus sed. Suspendisse luctus leo sapien. Fusce pulvinar congue ante, eu efficitur massa blandit sit amet. Duis luctus nibh vel leo consequat volutpat. Suspendisse ac lacus eu lorem mattis malesuada semper vel justo. Vivamus fringilla fringilla turpis eu porttitor. Ut ullamcorper nec purus at semper. Donec at mi blandit, sollicitudin purus quis, pellentesque quam. Suspendisse potenti.";
    // Returns a random string of the given length
    public static ofLength(commentLength: number): string {
        return this.LOREM_IPSUM.substr(Math.random() * this.LOREM_IPSUM.length, commentLength);
    }
}
