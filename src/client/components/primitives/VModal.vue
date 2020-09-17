<template>
    <div class="modal-overlay hidden-overlay" ref="overlay">
        <div class="modal-container">
            <slot name="header"></slot>
            <slot name="body"></slot>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class VModal extends Vue {
    public show(): void {
        const overlay = (this.$refs["overlay"] as HTMLElement);
        overlay.classList.remove("hidden-overlay");
        overlay.classList.add("visible-overlay");
    }
    public hide(): void {
        const overlay = (this.$refs["overlay"] as HTMLElement);
        overlay.classList.remove("visible-overlay");
        overlay.classList.add("hidden-overlay");
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

.modal-overlay {
    position: absolute;
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    left: 0;
    top: 0;
    background-color: rgba(@theme-neutral-color, 0.75);
    display: none;
}
.modal-overlay, .modal-overlay * {
    z-index: 9999;
}
.visible-overlay {
    display: block;
}
.hidden-overlay {
    display: none;
}

.modal-container {
    position: absolute;
    transform: translate(-50%, -50%);
    left: 50%;
    top: 50%;
    background-color: @theme-background;
    color: @theme-text-color;
    padding: 2.5em;
}
</style>
