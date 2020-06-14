<template>
    <div class="comment-section-root">
        <CommentThreadComponent
            v-for="thread in allThreads" :key="thread.id"
            :thread=thread
        />
    </div>
</template>

<script lang="ts">

import { Component, Vue } from "vue-property-decorator";
import { default as CommentThread } from "@/logic/Comments";

import CommentThreadComponent from "./CommentThread.vue";

@Component({
    components: {
        CommentThreadComponent
    }
})
export default class CommentSection extends Vue {
    // Props
    public allThreads: CommentThread[];

    constructor() {
        super();

        this.allThreads = [];
        const commentsPerThread = 2;
        const nestedness = 2;
        this.allThreads.push(CommentThread.generateRandomThread(commentsPerThread));
        this.allThreads.push(CommentThread.generateRandomThreadWithChildren(commentsPerThread, nestedness));
        this.allThreads.push(CommentThread.generateRandomThread(commentsPerThread));
        this.allThreads.push(CommentThread.generateRandomThread(commentsPerThread));
        this.allThreads.push(CommentThread.generateRandomThread(commentsPerThread));
        this.allThreads.sort(CommentThread.compareTimepoints);
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-section-root {
    padding-left: 1em;
    padding-right: 1em;
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    // This limits the size of all threads; TODO revisit and pick a better number at a later stage
    max-height: 53vh;
}
.comment-thread-container { // Enhance the standard style of the comment-thread
    width: 18.5%; // 5 per row (almost 20%) but leave some negative space for margins
    max-height: 100%;
    overflow-y: auto;
}
</style>
