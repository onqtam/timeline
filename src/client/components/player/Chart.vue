<template>
    <div class="bar-container">
        <div v-for="(item, index) in barData"
            :key=index
            class="bar"
            :style="{ height: 'calc(' + item * 100 + '% - 2px)' }"
        />
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import store from "@/client/store";

@Component
export default class Chart extends Vue {
    get barData(): number[] {
        return store.state.play.commentDensityHistogramNormalized;
    }
}
</script>

<style scoped lang="less">

.bar-container {
    display: flex;
    align-items: flex-end;
    width: 100%;
    height: 100%;
    position: absolute;
}

.bar {
    flex-grow: 1;
    background-color: red;
    margin-right: 1px;
    transition: 0.5s;
}

</style>
