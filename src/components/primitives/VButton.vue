<template>
    <a class="v-button" v-on=inputListeners>
        <slot>Button</slot>
    </a>
</template>


<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class VButton extends Vue {
    // Forward all native input event handlers
    public get inputListeners(): Object {
        return this.$listeners;
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

.v-button {
    background: @theme-text-color;
    color: @theme-background;
    cursor: pointer;
    display: inline-block;
    padding: 0.4em;
    margin: 0.4em;
    box-sizing: border-box;
    user-select: none;
    font-size: 0.8em;

    &:hover {
        color: @theme-background-color-hover;
    }
    &:active {
        outline: 2px double @theme-neutral-color;
    }
}
</style>
