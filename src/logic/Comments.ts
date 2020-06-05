import Timepoint from "./Timepoint";

// Threads have odd ids, comments have even
let CommentIdCounter = 0;
let CommentThreadIdCounter = 1;

export class Comment {
    public id!: number;
    public author!: string;
    public content!: string;
    public timepoint!: Timepoint;
    public date!: Date;

    constructor() {
        this.id = (CommentIdCounter += 2);
    }
}

export type CommentPrimitive = CommentThread | Comment;
export default class CommentThread {
    public id: number;
    public threadHead!: Comment;
    public threadTail!: CommentPrimitive[];

    constructor() {
        this.id = (CommentThreadIdCounter += 2);
    }

    public static generateComment(): Comment {
        // Random generate comments
        const maxAudioDuration = 120;
        const authors = ["Nikola", "Viktor", "Dimitroff", "Kirilov", "onqtam", "podcastfan99"];
        const loremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ac velit neque. Pellentesque mattis velit arcu, eget pharetra arcu finibus sed. Suspendisse luctus leo sapien. Fusce pulvinar congue ante, eu efficitur massa blandit sit amet. Duis luctus nibh vel leo consequat volutpat. Suspendisse ac lacus eu lorem mattis malesuada semper vel justo. Vivamus fringilla fringilla turpis eu porttitor. Ut ullamcorper nec purus at semper. Donec at mi blandit, sollicitudin purus quis, pellentesque quam. Suspendisse potenti.";
        const loremIpsumMaxCutout = 20;

        const comment = new Comment();
        comment.author = authors[Math.floor(Math.random() * authors.length)];
        comment.timepoint = new Timepoint(Math.random() * maxAudioDuration);
        // Pick a random date in 2020
        comment.date = new Date(2020, Math.random() * 12, Math.random() * 28);
        // Pick a somewhat random section of lorem ipsum;
        comment.content = loremIpsum.substring(Math.random() * loremIpsumMaxCutout, loremIpsum.length - Math.random() * loremIpsumMaxCutout);
        return comment;
    }

    public static generateRandomThread(commentsToGenerate: number): CommentThread {
        const thread = new CommentThread();
        thread.threadTail = [];
        for (let i = 0; i < commentsToGenerate; i++) {
            thread.threadTail.push(CommentThread.generateComment());
        }
        thread.threadHead = CommentThread.generateComment();

        return thread;
    }

    public static generateRandomThreadWithChildren(commentsToGenerate: number, nestedLevels: number): CommentThread {
        const thread = new CommentThread();
        thread.threadTail = [];
        let generatePrimitive: Function;
        if (nestedLevels > 0) {
            generatePrimitive = () => CommentThread.generateRandomThreadWithChildren(commentsToGenerate, nestedLevels - 1);
        } else {
            generatePrimitive = () => CommentThread.generateComment();
        }
        for (let i = 0; i < commentsToGenerate; i++) {
            thread.threadTail.push(generatePrimitive());
        }
        thread.threadHead = CommentThread.generateComment();

        return thread;
    }
}
