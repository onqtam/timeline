import User from "../../logic/entities/User";
import Comment from "../../logic/entities/Comments";
import { RandomIntegerDistribution, RandomString } from "../../logic/RandomHelpers";
import MathHelpers from "../../logic/MathHelpers";
import Timepoint from "../../logic/entities/Timepoint";
import { Episode } from "../../logic/entities/Episode";
// import VoteCommentRecord from "../../logic/entities/VoteCommentRecord";

export default class CommentGenerator {
    public users: User[];
    public episode: Episode;
    public readonly maxNestedComments: number = 1;

    constructor(users: User[], episode: Episode) {
        this.users = users;
        this.episode = episode;
    }

    public generateRandomComments(): Comment[] {
        const topLevelThreads: Comment[] = [];

        const commentsPerThread = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.35, 0.2, 0.15, 0.05, 0.1, 0.15]);
        const threadsPerTimeslot = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.4, 0.15, 0.1, 0.1, 0.1, 0.15]);
        const chanceForNested = 0.15;
        const timeslotDuration = 12;
        const minutesToGeneratesCommentsIn = 10; // only in the first X minutes
        for (let t = 0; t < minutesToGeneratesCommentsIn * 60; t += timeslotDuration) {
            const threadsInSlot = threadsPerTimeslot.sample();
            for (let i = 0; i < threadsInSlot; i++) {
                let newThread: Comment;
                const commentsForCurrentThread = commentsPerThread.sample();
                const timepoint: Timepoint = new Timepoint(MathHelpers.randInRange(t, t + timeslotDuration));
                if (Math.random() <= chanceForNested) {
                    newThread = this.generateRandomThreadWithChildren(commentsForCurrentThread, this.maxNestedComments, timepoint);
                } else {
                    newThread = this.generateRandomThread(commentsForCurrentThread, timepoint);
                }
                topLevelThreads.push(newThread);
            }
        }

        return topLevelThreads;
    }

    public generateRandomVotes(comments: Comment[]): void {
        const votesPerCommentDistribution = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.5, 0.05, 0.05, 0.15, 0.25]);
        const chanceForPositiveVote = 0.75;
        for (const comment of comments) {
            for (let i = 0; i < votesPerCommentDistribution.sample(); i++) {
                // TODO: It's pretty weird to always pick the same user to vote
                // const votingUser: User = this.users[i];
                const isVotePositive: boolean = Math.random() >= chanceForPositiveVote;
                if (isVotePositive) {
                    comment.upVotes++;
                } else {
                    comment.downVotes++;
                }
                // const voteRecord = new VoteCommentRecord(comment.id, votingUser.id, comment.episode.id, isVotePositive);
                // voteRecord.owningActivity = votingUser.activity;
                // votingUser.activity.voteRecords = votingUser.activity.voteRecords || [];
                // votingUser.activity.voteRecords.push(voteRecord);
            }
        }
    }

    public generateComment(timepoint: Timepoint): Comment {
        const differentCommentLengths = [
            5, 5, 5, 15, 15, 30, 30, 150, 300
        ];
        const commentLength = differentCommentLengths[~~(Math.random() * differentCommentLengths.length)];

        const comment = new Comment();
        comment.episodeId = this.episode.id;
        const author = this.users[Math.floor(Math.random() * this.users.length)];
        comment.authorId = author.id;
        comment.authorName = author.shortName;
        comment.timepoint = timepoint;
        // Pick a random date earlier in 2020
        const now = new Date();
        comment.date_added = new Date(2020, Math.random() * (now.getMonth() - 1), Math.random() * 28);
        comment.date_modified = comment.date_added;
        comment.content = RandomString.ofLength(commentLength);
        comment.upVotes = 0;
        comment.downVotes = 0;
        return comment;
    }

    public generateRandomThread(commentsToGenerate: number, timepoint: Timepoint): Comment {
        const thread = this.generateComment(timepoint);
        thread.replies = [];
        for (let i = 0; i < commentsToGenerate; i++) {
            const nextComment = this.generateComment(thread.timepoint);
            nextComment.parentComment = thread;
            thread.replies.push(nextComment);
        }

        return thread;
    }

    private generateRandomThreadWithChildren(commentsToGenerate: number, nestedLevels: number, timepoint: Timepoint): Comment {
        const thread = this.generateComment(timepoint);
        thread.replies = [];

        let generatePrimitive: () => Comment;
        if (nestedLevels > 0) {
            generatePrimitive = (): Comment => this.generateRandomThreadWithChildren(commentsToGenerate, nestedLevels - 1, thread.timepoint);
        } else {
            generatePrimitive = (): Comment => this.generateComment(thread.timepoint);
        }
        for (let i = 0; i < commentsToGenerate; i++) {
            const nextComment = generatePrimitive();
            nextComment.parentComment = thread;
            thread.replies.push(nextComment);
        }

        return thread;
    }
}
