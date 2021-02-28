import { ActionContext } from "vuex";
import store from "@/client/store";
import Timepoint from "@/logic/entities/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Comment from "@/logic/entities/Comments";
import VoteCommentRecord from "@/logic/entities/VoteCommentRecord";
import MathHelpers from "@/logic/MathHelpers";
import { Episode } from "@/logic/entities/Channel";
import { ActiveAppMode } from "./StoreDeviceInfoModule";
import AsyncLoader from "../utils/AsyncLoader";
import CommonParams from "@/logic/CommonParams";
import { HTTPVerb } from "@/logic/HTTPVerb";
import { SettingPair } from "./StoreUserModule";
import User from "@/logic/entities/User";

export interface IStorePlayModule {
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
    votesByUser: VoteCommentRecord[];
}

class StorePlayViewModel implements IStorePlayModule {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: Comment[];
    public commentDensityHistogram: Histogram;
    public upvotes: Set<number>; // this being in user instead of play is arbitrary
    public downvotes: Set<number>; // this being in user instead of play is arbitrary
    public activeEpisode!: Episode;
    public commentToDelete?: Comment = undefined;

    constructor() {
        this.audioFile = new AudioFile();
        this.audioPos = new Timepoint();
        this.audioWindow = new AudioWindow(this.audioFile, new Timepoint(0), 80, 4);
        this.volume = 0.95;
        this.allThreads = [];

        this.commentDensityHistogram = {
            xAxis: [],
            yAxis: [],
            xAxisDistance: 0
        };
        this.upvotes = new Set<number>();
        this.downvotes = new Set<number>();
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
        const maxWindowStart = Math.max(0, this.audioFile.duration - newWindowDuration);
        this.audioWindow.start.seconds = MathHelpers.clamp(unclampedWindowStart, 0, maxWindowStart);
        this.audioWindow.duration = newWindowDuration;
    }
    public moveAudioWindow(newStart: number): void {
        this.audioWindow.start.seconds = newStart;
    }
    public moveAudioPos(newPos: number): void {
        // TODO: perhaps not assert but handle it gracefully?
        console.assert(newPos <= this.audioFile.duration);
        this.audioPos.seconds = newPos;
    }
    public setAudioWindow(start: number, end: number): void {
        console.assert(start <= this.audioFile.duration);
        console.assert(end <= this.audioFile.duration);
        console.assert(start < end);
        this.audioWindow.start.seconds = start;
        this.audioWindow.duration = end - start;
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
        comment.authorId = store.state.user.info.id;
        comment.authorName = store.state.user.info.shortName;
        comment.episodeId = this.activeEpisode.id;
        comment.content = content;
        comment.date_added = new Date();
        comment.date_modified = new Date();
        comment.timepoint = new Timepoint(this.audioPos.seconds);
        comment.upVotes = 0;
        comment.downVotes = 0;

        return comment;
    }

    public async loadCommentData(episode: Episode): Promise<FullCommentData> {
        console.log(`Fetching ALL comments for episode ${episode.id}`);
        const loadCommentsURL: string = `${CommonParams.APIServerRootURL}/comments/${episode.id}/${0}-${episode.durationInSeconds}`;
        const query_comments = AsyncLoader.makeRestRequest(loadCommentsURL, HTTPVerb.Get, null, Comment) as Promise<Comment[]>;

        const loadHistogramURL: string = `${CommonParams.APIServerRootURL}/comments/histogram/${episode.id}`;
        const query_histogram = AsyncLoader.makeRestRequest(loadHistogramURL, HTTPVerb.Get, null) as Promise<Histogram>;

        let votesByUser: VoteCommentRecord[] = [];
        if (!store.state.user.info.isGuest) {
            const loadVotesURL: string = `${CommonParams.APIServerRootURL}/comments/votes/${episode.id}`;
            const query_votes = AsyncLoader.makeRestRequest(loadVotesURL, HTTPVerb.Get, null) as Promise<VoteCommentRecord[]>;
            // TODO: ideally we would await all 3 at the same time
            votesByUser = await query_votes;
        }

        return {
            allComments: await query_comments,
            commentDensityHistogram: await query_histogram,
            votesByUser: votesByUser
        };
    }
}

const playModule = new StorePlayViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: playModule,
    mutations: {
        setup: (state: StorePlayViewModel): void => {
            store.state.user.settingsModifiedEvent.subscribe((modifiedSetting: SettingPair) => {
                // TODO: Once ts-nameof is correctly installed use nameof for the keys
                switch (modifiedSetting.key) {
                case "audioWindowTimeslotCount":
                    state.setAudioWindowSlots(modifiedSetting.value as number);
                    break;
                }
            });
        },
        // Should only be called by the loadEpisode action
        internalSetActiveEpisode: (state: StorePlayViewModel, episode: Episode): void => {
            state.activeEpisode = episode;
            state.audioFile.filepath = episode.audioURL;
            state.audioFile.duration = episode.durationInSeconds;
            // Force resize the audio window because it depends on the length of the audio
            state.resizeAudioWindow(state.audioWindow.duration);
        },
        internalSetActiveEpisodeComments: (state: StorePlayViewModel, commentData: FullCommentData): void => {
            state.allThreads = commentData.allComments;
            state.commentDensityHistogram = commentData.commentDensityHistogram;

            for (const curr of commentData.votesByUser) {
                if (curr.wasVotePositive) {
                    state.upvotes.add(curr.commentId);
                } else {
                    state.downvotes.add(curr.commentId);
                }
            }

            // The received histograms doesn't contain values beyond the last comment
            // so fill in trailing zeros
            // TODO: Figure out how to do this faster
            const valueCount: number = ~~(state.audioFile.duration / state.commentDensityHistogram.xAxisDistance);
            state.commentDensityHistogram.xAxis.length = valueCount;
            state.commentDensityHistogram.xAxis.fill(0);
            console.log("Comments for active episode updated");
        },
        internalLocalPostNewComment: (state: StorePlayViewModel, payload: { newLocalComment: Comment; commentToReplyTo: Comment|undefined }): void => {
            if (payload.commentToReplyTo) {
                payload.commentToReplyTo.replies.push(payload.newLocalComment);
            } else {
                state.allThreads.push(payload.newLocalComment);
            }
        },
        internalLocalEditComment: (state: StorePlayViewModel, payload: { comment: Comment; content: string }): void => {
            payload.comment.content = payload.content;
        },
        internalLocalUpdateCommentIdFromServer: (state: StorePlayViewModel, payload: { comment: Comment; serverId: number }): void => {
            payload.comment.id = payload.serverId;
        },
        internalLocalDeleteComment: (state: StorePlayViewModel, comment: Comment): void => {
            comment.authorId = User.deletedUserId;
            comment.authorName = User.deletedUserName;
            comment.content = Comment.deletedCommentContents;
        },
        internalLocalVote: (state: StorePlayViewModel, payload: { comment: Comment; isVotePositive: boolean}): void => {
            const comment = payload.comment;

            if (state.upvotes.has(comment.id)) {
                console.assert(!state.downvotes.has(comment.id));
                // negate the upvote regardless of the direction of the new vote
                state.upvotes.delete(comment.id);
                comment.upVotes -= 1;

                if (!payload.isVotePositive) {
                    state.downvotes.add(comment.id);
                    comment.downVotes += 1;
                }
            } else if (state.downvotes.has(comment.id)) {
                console.assert(!state.upvotes.has(comment.id));
                // negate the downvote regardless of the direction of the new vote
                state.downvotes.delete(comment.id);
                comment.downVotes -= 1;

                if (payload.isVotePositive) {
                    state.upvotes.add(comment.id);
                    comment.upVotes += 1;
                }
            } else {
                if (payload.isVotePositive) {
                    state.upvotes.add(comment.id);
                    comment.upVotes += 1;
                } else {
                    state.downvotes.add(comment.id);
                    comment.downVotes += 1;
                }
            }
        },
        setVolume: (state: StorePlayViewModel, newVolume: number): void => {
            state.volume = newVolume;
        },
        moveAudioWindow: (state: StorePlayViewModel, newStart: number): void => {
            // console.log("🚀 ~ file: StorePlayModule.ts ~ line 309 ~ newStart", newStart);
            state.moveAudioWindow(newStart);
        },
        moveAudioPos: (state: StorePlayViewModel, newStart: number): void => {
            // console.log("🚀 ~ file: StorePlayModule.ts ~ line 313 ~ newStart", newStart);
            state.moveAudioPos(newStart);
        },
        setAudioWindow: (state: StorePlayViewModel, payload: {start: number; end: number}): void => {
            // console.log("🚀 ~ file: StorePlayModule.ts ~ line 313 ~ newStart", newStart);
            state.setAudioWindow(payload.start, payload.end);
        },
        seekTo: (state: StorePlayViewModel, secondToSeekTo: number): void => {
            state.moveAudioPos(secondToSeekTo);
            if (!state.audioWindow.containsTimepoint(secondToSeekTo)) {
                const timeslotStart: number = state.audioWindow.findTimeslotStartForTime(secondToSeekTo);
                state.moveAudioWindow(timeslotStart);
            }
        },
        setAudioWindowSlots: (state: StorePlayViewModel, newSlots: number): void => {
            state.setAudioWindowSlots(newSlots);
        },
        updateTimeslotCount: (state: StorePlayViewModel, appMode: ActiveAppMode): void => {
            state.updateTimeslotCount(appMode);
        },
        setCommentToDelete: (state: StorePlayViewModel, payload?: Comment): void => {
            state.commentToDelete = payload;
        }
    },
    actions: {
        loadEpisode: (context: ActionContext<StorePlayViewModel, StorePlayViewModel>, episode: Episode): Promise<void> => {
            context.commit("internalSetActiveEpisode", episode);

            return context.state.loadCommentData(episode)
                .then((commentData: FullCommentData) => {
                    context.commit("internalSetActiveEpisodeComments", commentData);
                });
        },

        postComment: (context: ActionContext<StorePlayViewModel, StorePlayViewModel>, payload: { commentToReplyTo: Comment|undefined; content: string }): Promise<void> => {
            const newLocalComment: Comment = context.state.generateNewLocalComment(payload.content);
            context.commit("internalLocalPostNewComment", {
                newLocalComment: newLocalComment,
                commentToReplyTo: payload.commentToReplyTo
            });
            // server query after the local changes have been committed
            const URL: string = `${CommonParams.APIServerRootURL}/comments/`;
            const requestBody = {
                commentToReplyToId: payload.commentToReplyTo?.id || null,
                episodeId: context.state.activeEpisode.id,
                timepointSeconds: context.state.audioPos.seconds,
                content: payload.content
            };
            return (AsyncLoader.makeRestRequest(URL, HTTPVerb.Post, requestBody) as Promise<{ commentId: number }>).then(commentResult => {
                context.commit("internalLocalUpdateCommentIdFromServer", {
                    comment: newLocalComment,
                    serverId: commentResult.commentId
                });
            }) as unknown as Promise<void>;
        },

        editComment: (context: ActionContext<StorePlayViewModel, StorePlayViewModel>, payload: { comment: Comment; content: string }): Promise<void> => {
            context.commit("internalLocalEditComment", payload);
            // server query after the local changes have been committed
            const URL: string = `${CommonParams.APIServerRootURL}/comments/`;
            const requestBody = {
                commentId: payload.comment.id,
                episodeId: context.state.activeEpisode.id,
                content: payload.content
            };
            return AsyncLoader.makeRestRequest(URL, HTTPVerb.Put, requestBody) as Promise<void>;
        },

        deleteComment: (context: ActionContext<StorePlayViewModel, StorePlayViewModel>, comment: Comment): Promise<void> => {
            context.commit("internalLocalDeleteComment", comment);
            // server query after the local changes have been committed
            const URL: string = `${CommonParams.APIServerRootURL}/comments/`;
            return AsyncLoader.makeRestRequest(URL, HTTPVerb.Delete, { commentId: comment.id }) as Promise<void>;
        },

        vote: (context: ActionContext<StorePlayViewModel, StorePlayViewModel>, payload: { comment: Comment; isVotePositive: boolean}): Promise<void> => {
            context.commit("internalLocalVote", payload);
            // server query after the local changes have been committed
            const URL: string = `${CommonParams.APIServerRootURL}/comments/vote/`;
            const requestBody = {
                commentId: payload.comment.id,
                episodeId: context.state.activeEpisode.id, // TODO: change with comment.episodeId
                wasVotePositive: payload.isVotePositive
            };
            return AsyncLoader.makeRestRequest(URL, HTTPVerb.Post, requestBody) as Promise<void>;
        }
    }
};
