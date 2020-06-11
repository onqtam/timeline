<template>
    <div class="comment-container">
        <span class="author">{{ comment.author }}</span>
        <span class="timepoint">{{ comment.timepoint.format() }}</span>
        <span class="date">{{ comment.date.toLocaleDateString() }}</span>
        <hr>
        <p class="comment-section">
            {{ comment.content }}
        </p>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue } from "vue-property-decorator";
import { Comment } from "@/logic/Comments";

@Component
export default class CommentComponent extends Vue {
    // Props
    @Prop({ type: Comment })
    public comment!: Comment;
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-container {
    text-align: left;
    padding-left: 1em;
}

.author:after, .timepoint:after {
    content: ' --- ';
}
</style>
