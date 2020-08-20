import store from "@/client/store";
import Timepoint from "@/logic/entities/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Comment from "@/logic/entities/Comments";
import MathHelpers from "@/logic/MathHelpers";
import { RandomIntegerDistribution } from "@/logic/RandomHelpers";
import { Episode } from "@/logic/entities/Podcast";
import { ActiveAppMode } from "./StoreDeviceInfoModule";

export interface IStoreListenModule {
    audioFile: AudioFile;
    allThreads: Comment[];
    audioPos: Timepoint;
    audioWindow: AudioWindow;
    volume: number;
}

const LOCAL_STORAGE_KEY = "comment-data-per-episode";
class StoreListenViewModel implements IStoreListenModule {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: Comment[];
    public activeEpisode!: Episode;

    // TODO: Comments in an episode need to be stored in a database of some kind
    // This is an attempt to simulate that by storing them in a big dictionary
    private currentEpisodeKey!: string;

    constructor() {
        this.audioFile = new AudioFile();
        this.audioPos = new Timepoint();
        this.audioWindow = new AudioWindow(this.audioFile, new Timepoint(0), 80, 4);
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

    public setAudioWindowSlots(newSlotCount: number): void {
        this.audioWindow.timeslotCount = newSlotCount;
    }
    // Resizing the window will also move the start of the window
    // so that the old center of the window is the same as the new one if this possible.
    // If that's not possible (e.g. either side of the window has reached the respective audio file side)
    // we only resize in the direction it's possible to
    public resizeAudioWindow(newWindowDuration: number): void {
        const unclampedWindowStart: number = this.audioWindow.start.seconds - (newWindowDuration-this.audioWindow.duration)/2;
        const maxWindowStart = this.audioFile.duration - newWindowDuration;
        this.audioWindow.start.seconds = MathHelpers.clamp(unclampedWindowStart, 0, maxWindowStart);
        this.audioWindow.duration = newWindowDuration;
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
        // TODO COMMENTS
    }

    public postReply(parentThread: Comment, commentToReplyTo: Comment, content: string): void {
        // TODO COMMENTS
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
        // TODO COMMENTS
        //store.commit.user.recordVote({ commentId: comment.id, wasVotePositive: isVotePositive });
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
        // TODO COMMENTS
    }

    // Internal API
    private makeComment(content: string): Comment {
        const comment = new Comment();
        comment.author = store.state.user.info;
        comment.content = content;
        comment.date = new Date();
        return comment;
    }

    private createComments(episodeKey: string): void {
        // TODO COMMENTS
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
        resizeAudioWindow: (state: StoreListenViewModel, newDuration: number): void => {
            state.resizeAudioWindow(newDuration);
        },
        moveAudioWindow: (state: StoreListenViewModel, newStart: number): void => {
            state.moveAudioWindow(newStart);
        },
        moveAudioPos: (state: StoreListenViewModel, newStart: number): void => {
            state.moveAudioPos(newStart);
        },
        setAudioWindowSlots: (state: StoreListenViewModel, newSlots: number): void => {
            state.setAudioWindowSlots(newSlots);
        },
        updateTimeslotCount: (state: StoreListenViewModel, appMode: ActiveAppMode): void => {
            state.updateTimeslotCount(appMode);
        },
        postNewCommentThread: (state: StoreListenViewModel, content: string): void => {
            state.postNewCommentThread(content);
        },
        postReply: (state: StoreListenViewModel, payload: { parentThread: Comment; commentToReplyTo: Comment; content: string }): void => {
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
