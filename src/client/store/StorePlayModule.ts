import { ActionContext } from "vuex";
import store from "@/client/store";
import Timepoint from "@/logic/entities/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Comment from "@/logic/entities/Comments";
import VoteCommentRecord from "@/logic/entities/VoteCommentRecord";
import { Episode } from "@/logic/entities/Channel";
import AsyncLoader from "../utils/AsyncLoader";
import CommonParams from "@/logic/CommonParams";
import { HTTPVerb } from "@/logic/HTTPVerb";
import User from "@/logic/entities/User";
import axios, { AxiosResponse } from "axios";

type FullCommentData = {
    allComments: Comment[];
    commentDensityHistogram: number[];
    votesByUser: VoteCommentRecord[];
}

class StorePlayViewModel {
    public audioFile!: AudioFile;
    public audioPos!: Timepoint;
    public audioWindow!: AudioWindow;
    public volume!: number;
    public allThreads!: Comment[];
    public commentDensityHistogram: number[];
    public upvotes: Set<number>; // this being in user instead of play is arbitrary
    public downvotes: Set<number>; // this being in user instead of play is arbitrary
    public activeEpisode!: Episode;
    public commentToDelete?: Comment = undefined;

    constructor() {
        this.audioFile = new AudioFile();
        this.audioPos = new Timepoint();
        this.audioWindow = new AudioWindow(this.audioFile, new Timepoint(0), 0);
        this.volume = 95;
        this.allThreads = [];

        this.commentDensityHistogram = [];
        this.upvotes = new Set<number>();
        this.downvotes = new Set<number>();
    }

    // we should use a dedicated getter because in the future we might not have
    // all comments loaded by default as is currently being done with allThreads
    // TODO: return the number of all comments and not just top-level threads
    public get numberOfCommentsTotal(): number {
        return this.allThreads.length;
    }

    public moveAudioWindow(newStart: number): void {
        this.audioWindow.start.seconds = newStart;
    }
    public moveAudioPos(newPos: number): void {
        if (newPos > this.audioFile.duration) {
            console.warn("position out of bounds for the episode!");
            newPos = this.audioWindow.start.seconds;
        }
        this.audioPos.seconds = newPos;
    }
    public setAudioWindow(start: number, end: number): void {
        if (end > this.audioFile.duration) {
            console.warn("end out of bounds for the episode!");
            end = this.audioFile.duration;
        }
        if (start > end) {
            console.warn("start is ahead of end for the episode!");
            start = end - 10;
        }
        this.audioWindow.start.seconds = start;
        this.audioWindow.duration = end - start;
    }

    public generateNewLocalComment(startSeconds: number, content: string): Comment {
        const comment = new Comment();
        comment.id = ~~(Math.random() * 99999); // Generate a random id to avoid conflicting keys in vue
        comment.userId = store.state.user.info.id;
        comment.userName = store.state.user.info.shortName;
        comment.episodeId = this.activeEpisode.id;
        comment.content = content;
        comment.date_added = new Date();
        comment.date_modified = new Date();
        comment.start = new Timepoint(startSeconds);
        comment.upVotes = 0;
        comment.downVotes = 0;

        return comment;
    }

    public async loadCommentData(episode: Episode): Promise<FullCommentData> {
        console.log(`Fetching ALL comments for episode ${episode.id}`);
        const loadCommentsURL: string = `${CommonParams.APIServerRootURL}/comments/${episode.id}/${0}-${episode.durationInSeconds}`;
        const query_comments = AsyncLoader.makeRestRequest(loadCommentsURL, HTTPVerb.Get, null, Comment) as Promise<Comment[]>;

        const loadHistogramURL: string = `${CommonParams.APIServerRootURL}/comments/histogram/${episode.id}`;
        const query_histogram = AsyncLoader.makeRestRequest(loadHistogramURL, HTTPVerb.Get, null) as Promise<number[]>;

        let query_votes: Promise<VoteCommentRecord[]> = Promise.resolve([]);
        if (!store.state.user.info.isGuest) {
            const loadVotesURL: string = `${CommonParams.APIServerRootURL}/comments/votes/${episode.id}`;
            query_votes = AsyncLoader.makeRestRequest(loadVotesURL, HTTPVerb.Get, null) as Promise<VoteCommentRecord[]>;
        }

        return {
            allComments: await query_comments,
            commentDensityHistogram: await query_histogram,
            votesByUser: await query_votes
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
        setup: (_state: StorePlayViewModel): void => {
            // store.state.user.settingsModifiedEvent.subscribe((modifiedSetting: SettingPair) => {
            //     // TODO: Once ts-nameof is correctly installed use nameof for the keys
            //     switch (modifiedSetting.key) {
            //     case "audioWindowTimeslotCount":
            //         state.setAudioWindowSlots(modifiedSetting.value as number);
            //         break;
            //     }
            // });
        },
        // Should only be called by the loadEpisode action
        internalSetActiveEpisode: (state: StorePlayViewModel, episode: Episode): void => {
            state.activeEpisode = episode;
            state.audioFile.filepath = episode.resource_url ? episode.resource_url : "";
            state.audioFile.duration = episode.durationInSeconds;
            state.setAudioWindow(0, state.audioFile.duration / 10); // 10% of the episode
        },
        internalSetActiveEpisodeComments: (state: StorePlayViewModel, commentData: FullCommentData): void => {
            state.allThreads = commentData.allComments;
            state.commentDensityHistogram = commentData.commentDensityHistogram;

            commentData.votesByUser.map(curr => {
                if (curr.wasVotePositive) {
                    state.upvotes.add(curr.commentId);
                } else {
                    state.downvotes.add(curr.commentId);
                }
            });

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
            comment.userId = User.deletedUserId;
            comment.userName = User.deletedUserName;
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
            state.moveAudioWindow(newStart);
        },
        moveAudioPos: (state: StorePlayViewModel, newStart: number): void => {
            state.moveAudioPos(newStart);
        },
        setAudioWindow: (state: StorePlayViewModel, payload: {start: number; end: number}): void => {
            state.setAudioWindow(payload.start, payload.end);
        },
        seekTo: (state: StorePlayViewModel, secondToSeekTo: number): void => {
            state.moveAudioPos(secondToSeekTo);
            if (!state.audioWindow.containsTimepoint(state.audioPos.seconds)) {
                const windowStart: number = state.audioWindow.findWindowStartForTime(state.audioPos.seconds);
                state.moveAudioWindow(windowStart);
            }
        },
        // setAudioWindowSlots: (state: StorePlayViewModel, newSlots: number): void => {
        //     state.setAudioWindowSlots(newSlots);
        // },
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
            const startSeconds = Math.round(payload.commentToReplyTo ? payload.commentToReplyTo.start.seconds : context.state.audioPos.seconds);
            const newLocalComment: Comment = context.state.generateNewLocalComment(startSeconds, payload.content);
            context.commit("internalLocalPostNewComment", {
                newLocalComment: newLocalComment,
                commentToReplyTo: payload.commentToReplyTo
            });
            // server query after the local changes have been committed
            const URL: string = `${CommonParams.APIServerRootURL}/comments/`;
            const requestBody = {
                commentToReplyToId: payload.commentToReplyTo?.id || null,
                episodeId: context.state.activeEpisode.id,
                startSeconds: startSeconds,
                content: payload.content
            };

            return axios.post(URL, requestBody, { withCredentials: true })
                .then((result: AxiosResponse<{commentId: number}>) => {
                    context.commit("internalLocalUpdateCommentIdFromServer", {
                        comment: newLocalComment,
                        serverId: result.data.commentId
                    });
                });
            // return (AsyncLoader.makeRestRequest(URL, HTTPVerb.Post, requestBody) as Promise<{ commentId: number }>).then(commentResult => {
            //     context.commit("internalLocalUpdateCommentIdFromServer", {
            //         comment: newLocalComment,
            //         serverId: commentResult.commentId
            //     });
            // }) as unknown as Promise<void>;
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
