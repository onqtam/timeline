<template>
    <a class="v-toggle-button"
        v-on=inputListeners
        :class="{ 'active-button': isActive }"
    >
        <slot>Button</slot>
    </a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class VToggleButton extends Vue {
    @Prop({ type: Boolean })
    public isActive!: boolean;

    // Forward all native input event handlers
    public get inputListeners(): Record<string, Function | Function[]> {
        return this.$listeners;
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

.v-toggle-button {
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
        outline: 2px double @theme-focus-color-4;
        background: @theme-text-color-hover;
    }
    &.active-button {
        background: @theme-text-color-hover;
        outline: 2px double @theme-focus-color-4;
    }
}
</style>
