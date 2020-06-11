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
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-section-root {
    padding-left: 2.5em;
}
</style>
