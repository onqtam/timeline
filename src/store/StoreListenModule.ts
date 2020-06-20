import store from "@/store";
import Timepoint from "@/logic/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import { Comment, default as CommentThread } from "@/logic/Comments";

export interface IStoreListenModule {
    audioFile: AudioFile;
    allThreads: CommentThread[];
    audioPos: Timepoint;
    audioWindow: AudioWindow;
    volume: number;
}

class StoreListenViewModel implements IStoreListenModule {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: CommentThread[];

    constructor() {
        this.audioFile = new AudioFile();
        this.audioFile.filepath = "../assets/Making_Sense_206_Frum.mp3";
        this.audioFile.duration = 5403;
        this.audioPos = new Timepoint();
        this.audioWindow = new AudioWindow(new Timepoint(0), 60, 12);
        this.volume = 0.15;
        this.allThreads = [];
        this.createComments();
    }

    public moveAudioWindow(newStart: number): void {
        this.audioWindow.start.seconds = newStart;
    }
    public moveAudioPos(newStart: number): void {
        this.audioPos.seconds = newStart;
    }

    public postNewCommentThread(content: string): void {
        const thread = new CommentThread();
        thread.timepoint = new Timepoint(this.audioPos.seconds);
        thread.threadHead = this.makeComment(content);
        thread.threadTail = [];
        this.allThreads.push(thread); // TODO: Binary insert to keep all threads ordered?
        this.saveCommentsToLocalStorage();
    }

    public postReply(parentThread: CommentThread, commentToReplyTo: Comment, content: string): void {
        const newComment = this.makeComment(content);
        if (parentThread.threadHead === commentToReplyTo) {
            // Replying to the head, just append
            parentThread.threadTail.push(newComment);
        } else {
            // Gotta start a new subthread
            const commentIndex = parentThread.threadTail.indexOf(commentToReplyTo);
            const subThread = new CommentThread();
            subThread.timepoint = parentThread.timepoint;
            subThread.threadHead = commentToReplyTo;
            subThread.threadTail = [newComment];
            parentThread.threadTail[commentIndex] = subThread;
        }
        this.saveCommentsToLocalStorage();
    }

    public vote(comment: Comment, isVotePositive: boolean): void {
        const existingVoteRecord = store.state.user.info.activity.getVoteOnComment(comment.id);
        if (existingVoteRecord !== undefined) {
            // Already voted, revert the previous vote
            comment.upVotes -= ~~existingVoteRecord;
            comment.downVotes -= ~~!existingVoteRecord;
        }
        comment.upVotes += ~~isVotePositive;
        comment.downVotes += ~~!isVotePositive;
        store.commit.user.recordVote({ commentId: comment.id, wasVotePositive: isVotePositive });
        this.saveCommentsToLocalStorage();
    }

    public revertVote(comment: Comment): void {
        const existingVoteRecord = store.state.user.info.activity.getVoteOnComment(comment.id);
        console.assert(existingVoteRecord !== undefined);
        // revert the previous vote
        comment.upVotes -= ~~existingVoteRecord!;
        comment.downVotes -= ~~!existingVoteRecord!;
        store.commit.user.revertVote(comment.id);
        this.saveCommentsToLocalStorage();
    }

    public regenerateComments(): void {
        this.allThreads.splice(0, this.allThreads.length);

        const commentsPerThread = 2;
        const nestedness = 1;
        const secondsBetweenThreads = 6;
        const varianceBetweenSeconds = 6;
        const maxAudioDuration = 5403;
        const chanceForNested = 0.15;
        // Use this func to randomize comment sections
        const nextCommentThreadRand = (t: number) => t + (Math.random() - 0.5) * varianceBetweenSeconds + secondsBetweenThreads;
        // Use this func to always generate comments at numbers divisible by 12
        const nextCommentThread12 = (t: number) => t + 12;
        // Use this func to always generate comments divisible by 12, but sometimes skip some
        const nextCommentThread12Skip = (t: number) => t + 12 * [1, 1, 1, 2, 3][~~(Math.random() * 5)];
        console.log(nextCommentThreadRand, nextCommentThread12, nextCommentThread12Skip); // log all to silence warnings
        const nextCommentThread = nextCommentThreadRand;
        for (let i = nextCommentThread(0); i < maxAudioDuration; i = nextCommentThread(i)) {
            let newThread: CommentThread;
            if (Math.random() <= chanceForNested) {
                newThread = CommentThread.generateRandomThreadWithChildren(commentsPerThread, nestedness);
            } else {
                newThread = CommentThread.generateRandomThread(commentsPerThread);
            }
            newThread.timepoint.seconds = i;
            this.allThreads.push(newThread);
        }
        this.saveCommentsToLocalStorage();
    }

    // Internal API
    private makeComment(content: string): Comment {
        const comment = new Comment();
        comment.author = store.state.user.info.shortName;
        comment.content = content;
        comment.date = new Date();
        return comment;
    }

    private createComments(): void {
        const commentData: string | null = localStorage.getItem("comment-data");
        if (commentData !== null) {
            this.loadCommentsFromJSON(commentData);
        } else {
            // TODO: don't need to prune everything
            localStorage.clear();
            this.regenerateComments();
        }
    }

    private loadCommentsFromJSON(commentData: string): void {
        // Declare JSON-equivalent types for type checking
        type RawComment = { id: string; author: string; content: string; date: string; upVotes: string; downVotes: string };
        type RawThread = { id: string; timepoint: {seconds: string}; threadHead: RawComment; threadTail: (RawComment | RawThread)[] };

        const rawCommentThreads: [] = JSON.parse(commentData);
        const loadComment = (rawComment: RawComment) => {
            const comment = new Comment();
            comment.id = ~~rawComment.id;
            comment.author = rawComment.author;
            comment.content = rawComment.content;
            comment.date = new Date(rawComment.date);
            comment.upVotes = ~~rawComment.upVotes;
            comment.downVotes = ~~rawComment.downVotes;
            return comment;
        };
        const loadThread = (rawThread: RawThread) => {
            const newThread = new CommentThread();
            newThread.timepoint = new Timepoint(~~rawThread.timepoint.seconds);
            newThread.id = ~~rawThread.id;
            newThread.threadHead = loadComment(rawThread.threadHead);
            newThread.threadTail = [];
            for (let i = 0; i < rawThread.threadTail.length; i++) {
                const rawCommentPrimitive: RawComment | RawThread = rawThread.threadTail[i];
                if ("author" in rawCommentPrimitive) {
                    newThread.threadTail.push(loadComment(rawCommentPrimitive));
                } else {
                    newThread.threadTail.push(loadThread(rawCommentPrimitive));
                }
            }
            return newThread;
        };

        this.allThreads.splice(0, this.allThreads.length);
        for (let i = 0; i < rawCommentThreads.length; i++) {
            this.allThreads.push(loadThread(rawCommentThreads[i]));
        }
    }

    private saveCommentsToLocalStorage(): void {
        localStorage.setItem("comment-data", JSON.stringify(this.allThreads));
    }
}

const listenModule = new StoreListenViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: listenModule,
    mutations: {
        moveAudioWindow: (state: StoreListenViewModel, newStart: number): void => {
            state.moveAudioWindow(newStart);
        },
        moveAudioPos: (state: StoreListenViewModel, newStart: number): void => {
            state.moveAudioPos(newStart);
        },
        postNewCommentThread: (state: StoreListenViewModel, content: string): void => {
            state.postNewCommentThread(content);
        },
        postReply: (state: StoreListenViewModel, payload: { parentThread: CommentThread; commentToReplyTo: Comment; content: string }): void => {
            state.postReply(payload.parentThread, payload.commentToReplyTo, payload.content);
        },
        vote: (state: StoreListenViewModel, payload: { comment: Comment; isVotePositive: boolean}): void => {
            state.vote(payload.comment, payload.isVotePositive);
        },
        revertVote: (state: StoreListenViewModel, comment: Comment): void => {
            state.revertVote(comment);
        },
        regenerateComments: (state: StoreListenViewModel): void => {
            state.regenerateComments();
        }
    }
};
