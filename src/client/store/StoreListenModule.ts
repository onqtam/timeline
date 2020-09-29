import store from "@/client/store";
import Timepoint from "@/logic/entities/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Comment from "@/logic/entities/Comments";
import MathHelpers from "@/logic/MathHelpers";
import { Episode } from "@/logic/entities/Podcast";
import { ActiveAppMode } from "./StoreDeviceInfoModule";
import AsyncLoader from "../utils/AsyncLoader";
import CommonParams from "@/logic/CommonParams";
import { HTTPVerb } from "@/logic/HTTPVerb";
import { ActionContext } from "vuex";

export interface IStoreListenModule {
    audioFile: AudioFile;
    allThreads: Comment[];
    audioPos: Timepoint;
    audioWindow: AudioWindow;
    volume: number;
}

type Histogram = {
    xAxis: number[];
    yAxis: number[];
    xAxisDistance: number;
};

type FullCommentData = {
    allComments: Comment[];
    commentDensityHistogram: Histogram;
}
class StoreListenViewModel implements IStoreListenModule {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: Comment[];
    public commentDensityHistogram: Histogram;
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

        this.commentDensityHistogram = {
            xAxis: [],
            yAxis: [],
            xAxisDistance: 0
        };
    }

    public setActiveEpisode(episode: Episode): void {
        this.activeEpisode = episode;
        this.audioFile.filepath = episode.audioURL;
        this.audioFile.duration = episode.durationInSeconds;
    }

    public setActiveEpisodeComments(commentData: FullCommentData): void {
        this.allThreads = commentData.allComments;
        this.commentDensityHistogram = commentData.commentDensityHistogram;
        // The received histograms doesn't contain values beyond the last comment
        // so fill in trailing zeros
        // TODO: Figure out how to do this faster
        const valueCount: number = ~~(this.audioFile.duration / this.commentDensityHistogram.xAxisDistance);
        this.commentDensityHistogram.xAxis.length = valueCount;
        this.commentDensityHistogram.xAxis.fill(0);
        console.log("Comments for active episode updated");
    }

    public setAudioWindowSlots(newSlotCount: number): void {
        this.audioWindow.timeslotCount = newSlotCount;
    }

    public setVolume(value: number): void {
        this.volume = value;
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

    public generateNewLocalComment(content: string): Comment {
        const comment = new Comment();
        comment.id = ~~(Math.random() * 99999); // Generate a random id to avoid conflicting keys in vue
        comment.author = store.state.user.info;
        comment.authorName = comment.author.shortName;
        comment.episode = this.activeEpisode;
        comment.content = content;
        comment.date = new Date();
        comment.timepoint = new Timepoint(this.audioPos.seconds);
        comment.upVotes = 0;
        comment.downVotes = 0;

        return comment;
    }

    public localPostNewComment(newLocalComment: Comment, commentToReplyTo: Comment|undefined): void {
        if (commentToReplyTo) {
            commentToReplyTo.replies.push(newLocalComment);
        } else {
            this.allThreads.push(newLocalComment);
        }
    }

    // This trivial method only exists to cope with the rule of not modifying store data outside of z
    public localUpdateCommentIdFromServer(comment: Comment, serverId: number): void {
        comment.id = serverId;
    }

    public isVoteValid(comment: Comment, isVotePositive: boolean|undefined): boolean {
        return store.state.user.info.activity.getVoteOnComment(comment.id) !== isVotePositive;
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
        store.commit.user.localRecordVote({ commentId: comment.id, wasVotePositive: isVotePositive });
    }

    public revertVote(comment: Comment): void {
        const existingVoteRecord = store.state.user.info.activity.getVoteOnComment(comment.id);
        console.assert(existingVoteRecord !== undefined);
        // revert the previous vote
        comment.upVotes -= ~~existingVoteRecord!;
        comment.downVotes -= ~~!existingVoteRecord!;
        store.commit.user.localRevertVote(comment.id);
    }

    public async loadCommentData(episode: Episode): Promise<FullCommentData> {
        console.log(`Fetching ALL comments for episode ${episode.id}`);
        const loadCommentsURL: string = `${CommonParams.APIServerRootURL}/comments/${episode.id}/${0}-${episode.durationInSeconds}`;
        const query_comments = AsyncLoader.makeRestRequest(loadCommentsURL, HTTPVerb.Get, null, Comment) as Promise<Comment[]>;
        const loadHistogramURL: string = `${CommonParams.APIServerRootURL}/comments/histogram/${episode.id}`;
        const query_histogram = AsyncLoader.makeRestRequest(loadHistogramURL, HTTPVerb.Get, null) as Promise<Histogram>;
        return {
            allComments: await query_comments,
            commentDensityHistogram: await query_histogram
        };
    }

    public async storeServerVote(comment: Comment, wasVotePositive: boolean): Promise<void> {
        const URL: string = `${CommonParams.APIServerRootURL}/comments/vote/`;
        const requestBody = {
            commentId: comment.id,
            wasVotePositive: wasVotePositive
        };
        const query_storeVote = AsyncLoader.makeRestRequest(URL, HTTPVerb.Post, requestBody) as Promise<void>;
        return query_storeVote;
    }

    public async storeServerVoteRevert(comment: Comment): Promise<void> {
        const URL: string = `${CommonParams.APIServerRootURL}/comments/vote/`;
        const requestBody = {
            commentId: comment.id
        };
        const query_revertVote = AsyncLoader.makeRestRequest(URL, HTTPVerb.Delete, requestBody) as Promise<void>;
        return query_revertVote;
    }

    public async storeServerNewComment(commentToReply: Comment|undefined, content: string): Promise<{ commentId: number }> {
        const URL: string = `${CommonParams.APIServerRootURL}/comments/`;
        const requestBody = {
            commentToReplyToId: commentToReply?.id || null,
            episodeId: this.activeEpisode.id,
            timepointSeconds: this.audioPos.seconds,
            content: content
        };
        const query_postNewComment = AsyncLoader.makeRestRequest(URL, HTTPVerb.Post, requestBody) as Promise<{ commentId: number }>;
        return query_postNewComment;
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
        // Should only be called by the loadEpisode action
        internalSetActiveEpisode: (state: StoreListenViewModel, episode: Episode): void => {
            state.setActiveEpisode(episode);
        },
        internalSetActiveEpisodeComments: (state: StoreListenViewModel, commentData: FullCommentData): void => {
            state.setActiveEpisodeComments(commentData);
        },
        internalLocalPostNewComment: (state: StoreListenViewModel, payload: { newLocalComment: Comment; commentToReplyTo: Comment|undefined }): void => {
            state.localPostNewComment(payload.newLocalComment, payload.commentToReplyTo);
        },
        internalLocalUpdateCommentIdFromServer: (state: StoreListenViewModel, payload: { comment: Comment; serverId: number }): void => {
            state.localUpdateCommentIdFromServer(payload.comment, payload.serverId);
        },
        internalLocalVote: (state: StoreListenViewModel, payload: { comment: Comment; isVotePositive: boolean}): void => {
            state.vote(payload.comment, payload.isVotePositive);
        },
        internalLocalRevertVote: (state: StoreListenViewModel, comment: Comment): void => {
            state.revertVote(comment);
        },
        setVolume: (state: StoreListenViewModel, newVolume: number): void => {
            state.setVolume(newVolume);
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
        }
    },
    actions: {
        loadEpisode: (context: ActionContext<StoreListenViewModel, StoreListenViewModel>, episode: Episode): Promise<void> => {
            context.commit("internalSetActiveEpisode", episode);

            return context.state.loadCommentData(episode)
                .then((commentData: FullCommentData) => {
                    context.commit("internalSetActiveEpisodeComments", commentData);
                });
        },
        postComment: (context: ActionContext<StoreListenViewModel, StoreListenViewModel>, payload: { commentToReplyTo: Comment|undefined; content: string }): Promise<void> => {
            const newLocalComment: Comment = context.state.generateNewLocalComment(payload.content);
            context.commit("internalLocalPostNewComment", {
                newLocalComment: newLocalComment,
                commentToReplyTo: payload.commentToReplyTo
            });
            const serverQuery = context.state.storeServerNewComment(payload.commentToReplyTo, payload.content);
            serverQuery.then(commentResult => {
                context.commit("internalLocalUpdateCommentIdFromServer", {
                    comment: newLocalComment,
                    serverId: commentResult.commentId
                });
            });
            return serverQuery as unknown as Promise<void>;
        },
        vote: (context: ActionContext<StoreListenViewModel, StoreListenViewModel>, payload: { comment: Comment; isVotePositive: boolean}): Promise<void> => {
            if (context.state.isVoteValid(payload.comment, payload.isVotePositive)) {
                // Commit locally to update the UI immediately
                context.commit("internalLocalVote", payload);
                return context.state.storeServerVote(payload.comment, payload.isVotePositive);
            }
            return Promise.resolve();
        },
        revertVote: (context: ActionContext<StoreListenViewModel, StoreListenViewModel>, comment: Comment): Promise<void> => {
            if (context.state.isVoteValid(comment, undefined)) {
                context.commit("internalLocalRevertVote", comment);
                return context.state.storeServerVoteRevert(comment);
            }
            return Promise.resolve();
        }
    }
};
