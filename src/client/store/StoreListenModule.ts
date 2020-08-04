import store from "@/client/store";
import Timepoint from "@/logic/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import { Comment, default as CommentThread } from "@/logic/Comments";
import MathHelpers from "@/logic/MathHelpers";
import { RandomIntegerDistribution } from "@/logic/RandomHelpers";
import { Episode } from "@/logic/Podcast";
import { ActiveAppMode } from "./StoreDeviceInfoModule";

export interface IStoreListenModule {
    audioFile: AudioFile;
    allThreads: CommentThread[];
    audioPos: Timepoint;
    audioWindow: AudioWindow;
    volume: number;
}

// Declare JSON-equivalent types for type checking
type RawComment = { id: string; author: string; content: string; date: string; upVotes: string; downVotes: string };
type RawThread = { id: string; timepoint: {seconds: string}; threadHead: RawComment; threadTail: (RawComment | RawThread)[] };
type ThreadsPerEpisode = Record<string, RawThread[]>;
const LOCAL_STORAGE_KEY = "comment-data-per-episode";
class StoreListenViewModel implements IStoreListenModule {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: CommentThread[];
    public activeEpisode!: Episode;

    // TODO: Comments in an episode need to be stored in a database of some kind
    // This is an attempt to simulate that by storing them in a big dictionary
    private currentEpisodeKey!: string;

    constructor() {
        this.audioFile = new AudioFile();
        this.audioPos = new Timepoint();
        this.audioWindow = new AudioWindow(new Timepoint(0), 80, 20);
        this.volume = 0.15;
        this.allThreads = [];
        this.currentEpisodeKey = "";
    }

    public setActiveEpisode(episode: Episode): void {
        this.activeEpisode = episode;
        this.audioFile.filepath = episode.audioURL;
        this.audioFile.duration = episode.durationInSeconds;
        const episodeKey = episode.titleAsURL;
        this.createComments(episodeKey);
    }

    public moveAudioWindow(newStart: number): void {
        // TODO: Assert we are jumping to a timeslot
        // Can we instead do the math here to avoid code duplication in caller sites?
        console.assert(this.audioWindow.findTimeslotStartForTime(newStart) === newStart);
        this.audioWindow.start.seconds = newStart;
    }
    public moveAudioPos(newStart: number): void {
        this.audioPos.seconds = newStart;
    }
    public updateTimeslotCount(appMode: ActiveAppMode): void {
        switch (appMode) {
        case ActiveAppMode.LargeDesktop:
            this.audioWindow.timeslotCount = 7;
            break;
        case ActiveAppMode.StandardScreen:
            this.audioWindow.timeslotCount = 5;
            break;
        case ActiveAppMode.Tablet:
            this.audioWindow.timeslotCount = 3;
            break;
        case ActiveAppMode.Mobile:
            this.audioWindow.timeslotCount = 1;
            break;
        }
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
            // Splice, don't assign so that Vue catches the change
            parentThread.threadTail.splice(commentIndex, 1, subThread);
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

        const commentsPerThread = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.35, 0.2, 0.15, 0.05, 0.1, 0.15]);
        const threadsPerTimeslot = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.4, 0.15, 0.1, 0.1, 0.1, 0.15]);
        const nestedness = 1;
        const maxAudioDuration = 5403;
        const chanceForNested = 0.15;
        const timeslotDuration = 12;
        for (let t = 0; t < maxAudioDuration; t += timeslotDuration) {
            const threadsInSlot = threadsPerTimeslot.sample();
            for (let i = 0; i < threadsInSlot; i++) {
                let newThread: CommentThread;
                const commentsForCurrentThread = commentsPerThread.sample();
                if (Math.random() <= chanceForNested) {
                    newThread = CommentThread.generateRandomThreadWithChildren(commentsForCurrentThread, nestedness);
                } else {
                    newThread = CommentThread.generateRandomThread(commentsForCurrentThread);
                }
                newThread.timepoint.seconds = MathHelpers.randInRange(t, t + timeslotDuration);
                this.allThreads.push(newThread);
            }
        }
    }

    // Internal API
    private makeComment(content: string): Comment {
        const comment = new Comment();
        comment.author = store.state.user.info.shortName;
        comment.content = content;
        comment.date = new Date();
        return comment;
    }

    private createComments(episodeKey: string): void {
        this.currentEpisodeKey = episodeKey;
        const commentData: string | null = localStorage.getItem(LOCAL_STORAGE_KEY + episodeKey);
        const rawCommentThreads: RawThread[]|undefined = JSON.parse(commentData || "{}");
        if (rawCommentThreads) {
            this.loadCommentsFromJSON(rawCommentThreads);
        } else {
            // TODO: don't need to prune everything
            localStorage.clear();
            this.regenerateComments();
        }
    }

    private loadCommentsFromJSON(rawCommentThreads: RawThread[]): void {
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
        this.saveCommentsToLocalStorage();
    }

    private saveCommentsToLocalStorage(): void {
        localStorage.setItem(LOCAL_STORAGE_KEY + this.currentEpisodeKey, JSON.stringify(this.allThreads));
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
        setActiveEpisode: (state: StoreListenViewModel, episode: Episode): void => {
            state.setActiveEpisode(episode);
        },
        moveAudioWindow: (state: StoreListenViewModel, newStart: number): void => {
            state.moveAudioWindow(newStart);
        },
        moveAudioPos: (state: StoreListenViewModel, newStart: number): void => {
            state.moveAudioPos(newStart);
        },
        updateTimeslotCount: (state: StoreListenViewModel, appMode: ActiveAppMode): void => {
            state.updateTimeslotCount(appMode);
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
