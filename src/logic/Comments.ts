import Timepoint from "./Timepoint";

// Threads have odd ids, comments have even
let CommentIdCounter = 0;
let CommentThreadIdCounter = 1;

export class Comment {
    public id!: number;
    public author!: string;
    public content!: string;
    public date!: Date;
    public upVotes: number = 0;
    public downVotes: number = 0;

    constructor() {
        this.id = (CommentIdCounter += 2);
    }

    public formatApprovalRating(): string {
        const voteCount = this.upVotes + this.downVotes;
        if (voteCount === 0) {
            return "100%";
        }
        const approvalPercentage = 100 * this.upVotes / voteCount;
        return approvalPercentage.toFixed(0) + "%";
    }
}

export type CommentPrimitive = CommentThread | Comment;
export default class CommentThread {
    // Important: Never explicitly assigned outside of this class;
    // Its setter should be private but TS currently does not support private setters!
    public id: number;
    public timepoint!: Timepoint;
    public threadHead!: Comment;
    public threadTail!: CommentPrimitive[];

    constructor() {
        this.id = (CommentThreadIdCounter += 2);
    }

    public static compareTimepoints(lhs: CommentThread, rhs: CommentThread) {
        return lhs.timepoint.seconds - rhs.timepoint.seconds;
    }

    public static generateComment(): Comment {
        const maxPoints = 25;
        const authors = ["Nikola", "Viktor", "Dimitroff", "Kirilov", "onqtam", "podcastfan99"];
        const loremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ac velit neque. Pellentesque mattis velit arcu, eget pharetra arcu finibus sed. Suspendisse luctus leo sapien. Fusce pulvinar congue ante, eu efficitur massa blandit sit amet. Duis luctus nibh vel leo consequat volutpat. Suspendisse ac lacus eu lorem mattis malesuada semper vel justo. Vivamus fringilla fringilla turpis eu porttitor. Ut ullamcorper nec purus at semper. Donec at mi blandit, sollicitudin purus quis, pellentesque quam. Suspendisse potenti.";
        const differentCommentLengths = [
            5, 5, 5, 15, 15, 30, 30, 150, 300
        ];
        const commentLength = differentCommentLengths[~~(Math.random() * differentCommentLengths.length)];

        const comment = new Comment();
        comment.author = authors[Math.floor(Math.random() * authors.length)];
        // Pick a random date earlier in 2020
        const now = new Date();
        comment.date = new Date(2020, Math.random() * (now.getMonth() - 1), Math.random() * 28);
        // Pick a somewhat random section of lorem ipsum;
        comment.content = loremIpsum.substr(Math.random() * loremIpsum.length, commentLength);
        comment.upVotes = ~~(Math.random() * maxPoints);
        comment.downVotes = ~~(Math.random() * maxPoints);
        return comment;
    }

    private static maxAudioDuration = 5403;
    public static generateRandomThread(commentsToGenerate: number): CommentThread {
        const thread = new CommentThread();
        thread.threadTail = [];
        for (let i = 0; i < commentsToGenerate; i++) {
            thread.threadTail.push(CommentThread.generateComment());
        }
        thread.threadHead = CommentThread.generateComment();
        thread.timepoint = new Timepoint(~~(Math.random() * CommentThread.maxAudioDuration));

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
        thread.timepoint = new Timepoint(~~(Math.random() * CommentThread.maxAudioDuration));

        return thread;
    }
}
