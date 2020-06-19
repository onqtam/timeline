<template>
    <div>
        <button @click=regenerateComments>
            Regenerate Comments
        </button>
        <TimelinePlayer
            ref="timeline-player"
            class="timeline-player"
            :audio=audioFile :volume=0.15 :initialAudioPos=initialTimepoint
            :audioWindow=audioWindow
            @onAudioWindowMoved=onAudioWindowMoved
        />
        <CommentSection
            :audioWindow=audioWindow :commentThreads=allThreads
            @postNewCommentThread=postNewCommentThread
            @postReply=postReply
        />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";

import Timepoint from "@/logic/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import { Comment, default as CommentThread } from "@/logic/Comments";

import TimelinePlayer from "@/components/TimelinePlayer.vue";
import CommentSection from "@/components/CommentSection.vue";

@Component({
    components: {
        TimelinePlayer,
        CommentSection
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<PlayerView>) {
        // There's no "afterRouteUpdate"... so we can't directly use the prop initialTimepoint
        // Fetch the timepoint from the query
        const secondToSeekTo: number = ~~to.query.t;
        if (!isNaN(secondToSeekTo)) {
            (this.$refs["timeline-player"] as TimelinePlayer).syncTo(secondToSeekTo);
        }
        next();
    }
})
export default class PlayerView extends Vue {
    public audioFile: AudioFile = new AudioFile();
    public audioWindow: AudioWindow = new AudioWindow(new Timepoint(0), 60, 12); // 1 minute, timeslots of 12 seconds
    public allThreads: CommentThread[] = [];

    @Prop({ type: Timepoint })
    public initialTimepoint?: Timepoint;

    public get currentAudioPos(): Timepoint {
        const playerComponent: TimelinePlayer = this.$refs["timeline-player"] as TimelinePlayer;
        return playerComponent.getCurrentAudioPos();
    }

    constructor() {
        super();
        this.audioFile.filepath = "../assets/Making_Sense_206_Frum.mp3";
        this.audioFile.duration = 5403;
    }
    public mounted(): void {
        this.createComments();
    }

    public onAudioWindowMoved(newStart: number): void {
        this.audioWindow.start.seconds = newStart;
    }

    public postNewCommentThread(content: string): void {
        const thread = new CommentThread();
        thread.timepoint = new Timepoint(this.currentAudioPos.seconds);
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
        comment.author = "DEFAULT"; // TODO
        comment.content = content;
        comment.date = new Date();
        return comment;
    }

    private createComments(): void {
        const commentData: string | null = localStorage.getItem("comment-data");
        if (commentData !== null) {
            this.loadCommentsFromJSON(commentData);
        } else {
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
            comment.date = new Date(~~rawComment.date);
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
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.timeline-player, .comment-section-root {
    margin: 0 1em;
}

button {
    color: @theme-background;
}

.comment-section-root {
    // This limits the size of all threads; TODO revisit and pick a better number at a later stage
    height: 50vh;
    box-sizing: border-box;
    padding-bottom: 5vh;
}
</style>
