import { ActionContext } from "vuex";
import store from "@/client/store";
import Timepoint from "@/logic/entities/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Comment from "@/logic/entities/Comments";
import VoteCommentRecord from "@/logic/entities/VoteCommentRecord";
import MathHelpers from "@/logic/MathHelpers";
import { Episode } from "@/logic/entities/Podcast";
import { ActiveAppMode } from "./StoreDeviceInfoModule";
import AsyncLoader from "../utils/AsyncLoader";
import CommonParams from "@/logic/CommonParams";
import { HTTPVerb } from "@/logic/HTTPVerb";
import { SettingPair } from "./StoreUserModule";
import User from "@/logic/entities/User";

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
    votesByUser: VoteCommentRecord[];
}

class StoreListenViewModel implements IStoreListenModule {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: Comment[];
    public commentDensityHistogram: Histogram;
    public upvotes: Set<number>; // this being in user instead of listen is arbitrary
    public downvotes: Set<number>; // this being in user instead of listen is arbitrary
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

    public setup(): void {
        store.state.user.settingsModifiedEvent.subscribe((modifiedSetting: SettingPair) => {
            // TODO: Once ts-nameof is correctly installed use nameof for the keys
            switch (modifiedSetting.key) {
            case "audioWindowTimeslotCount":
                this.setAudioWindowSlots(modifiedSetting.value as number);
                break;
            case "audioWindowDuration":
                this.resizeAudioWindow(modifiedSetting.value as number);
                break;
            }
        });
    }

    public setActiveEpisode(episode: Episode): void {
        this.activeEpisode = episode;
        this.audioFile.filepath = episode.audioURL;
        this.audioFile.duration = episode.durationInSeconds;
        // Force resize the audio window because it depends on the length of the audio
        this.resizeAudioWindow(this.audioWindow.duration);
    }

    public setActiveEpisodeComments(commentData: FullCommentData): void {
        this.allThreads = commentData.allComments;
        this.commentDensityHistogram = commentData.commentDensityHistogram;

        for (const curr of commentData.votesByUser) {
            if (curr.wasVotePositive) {
                this.upvotes.add(curr.commentId);
            } else {
                this.downvotes.add(curr.commentId);
            }
        }

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
        const maxWindowStart = Math.max(0, this.audioFile.duration - newWindowDuration);
        this.audioWindow.start.seconds = MathHelpers.clamp(unclampedWindowStart, 0, maxWindowStart);
        this.audioWindow.duration = newWindowDuration;
    }
    public moveAudioWindow(newStart: number): void {
        // TODO: Assert we are jumping to a timeslot
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
        comment.authorId = store.state.user.info.id;
        comment.authorName = store.state.user.info.shortName;
        comment.episodeId = this.activeEpisode.id;
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

    public localDeleteComment(comment: Comment): void {
        // TODO: In several places in code we repeat the same actions on the server and client
        // Consider how to combine them if possible
        comment.authorId = User.deletedUserId;
        comment.authorName = User.deletedUserName;
        comment.content = Comment.deletedCommentContents;
    }

    // This trivial method only exists to cope with the rule of not modifying store data outside of z
    public localUpdateCommentIdFromServer(comment: Comment, serverId: number): void {
        comment.id = serverId;
    }

    public vote(comment: Comment, isVotePositive: boolean): void {
        if (this.upvotes.has(comment.id)) {
            console.assert(!this.downvotes.has(comment.id));
            // negate the upvote regardless of the direction of the new vote
            this.upvotes.delete(comment.id);
            comment.upVotes -= 1;

            if (!isVotePositive) {
                this.downvotes.add(comment.id);
                comment.downVotes += 1;
            }
        } else if (this.downvotes.has(comment.id)) {
            console.assert(!this.upvotes.has(comment.id));
            // negate the downvote regardless of the direction of the new vote
            this.downvotes.delete(comment.id);
            comment.downVotes -= 1;

            if (isVotePositive) {
                this.upvotes.add(comment.id);
                comment.upVotes += 1;
            }
        } else {
            if (isVotePositive) {
                this.upvotes.add(comment.id);
                comment.upVotes += 1;
            } else {
                this.downvotes.add(comment.id);
                comment.downVotes += 1;
            }
        }
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

        const comms = await query_comments;

        return {
            allComments: comms,
            commentDensityHistogram: await query_histogram,
            votesByUser: votesByUser
        };
    }

    public async storeServerVote(comment: Comment, wasVotePositive: boolean): Promise<void> {
        const URL: string = `${CommonParams.APIServerRootURL}/comments/vote/`;
        const requestBody = {
            commentId: comment.id,
            episodeId: this.activeEpisode.id, // TODO: change with comment.episodeId
            wasVotePositive: wasVotePositive
        };

        const query_storeVote = AsyncLoader.makeRestRequest(URL, HTTPVerb.Post, requestBody) as Promise<void>;
        return query_storeVote;
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

    public async deleteServerComment(comment: Comment): Promise<void> {
        const URL: string = `${CommonParams.APIServerRootURL}/comments/`;
        const requestBody = {
            commentId: comment.id
        };
        const query_postNewComment = AsyncLoader.makeRestRequest(URL, HTTPVerb.Delete, requestBody) as Promise<void>;
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
        setup: (state: StoreListenViewModel): void => {
            state.setup();
        },
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
        internalLocalDeleteComment: (state: StoreListenViewModel, comment: Comment): void => {
            state.localDeleteComment(comment);
        },
        internalLocalVote: (state: StoreListenViewModel, payload: { comment: Comment; isVotePositive: boolean}): void => {
            state.vote(payload.comment, payload.isVotePositive);
        },
        setVolume: (state: StoreListenViewModel, newVolume: number): void => {
            state.setVolume(newVolume);
        },
        moveAudioWindow: (state: StoreListenViewModel, newStart: number): void => {
            // console.log("🚀 ~ file: StoreListenModule.ts ~ line 309 ~ newStart", newStart);
            state.moveAudioWindow(newStart);
        },
        moveAudioPos: (state: StoreListenViewModel, newStart: number): void => {
            // console.log("🚀 ~ file: StoreListenModule.ts ~ line 313 ~ newStart", newStart);
            state.moveAudioPos(newStart);
        },
        setAudioWindowSlots: (state: StoreListenViewModel, newSlots: number): void => {
            state.setAudioWindowSlots(newSlots);
        },
        updateTimeslotCount: (state: StoreListenViewModel, appMode: ActiveAppMode): void => {
            state.updateTimeslotCount(appMode);
        },
        setCommentToDelete: (state: StoreListenViewModel, payload?: Comment): void => {
            state.commentToDelete = payload;
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
        deleteComment: (context: ActionContext<StoreListenViewModel, StoreListenViewModel>, comment: Comment): Promise<void> => {
            context.commit("internalLocalDeleteComment", comment);
            const serverQuery = context.state.deleteServerComment(comment);
            return serverQuery as unknown as Promise<void>;
        },
        vote: (context: ActionContext<StoreListenViewModel, StoreListenViewModel>, payload: { comment: Comment; isVotePositive: boolean}): Promise<void> => {
            // Commit locally to update the UI immediately
            context.commit("internalLocalVote", payload);
            return context.state.storeServerVote(payload.comment, payload.isVotePositive);
        }
    }
};
