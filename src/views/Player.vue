<template>
    <div>
        <TimelinePlayer msg="Welcome to Your Vue.js App"/>
        <CommentSection />
    </div>
</template>

<script>
import TimelinePlayer from "@/components/TimelinePlayer.vue";
import CommentSection from "@/components/CommentSection.vue";

export default {
    name: "player",
    components: {
        TimelinePlayer,
        CommentSection
    }
};
</script>
