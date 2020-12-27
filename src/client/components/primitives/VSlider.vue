<template>
    <div
        class="v-slider"
        @click=onClick
        >
        <div class="v-slider-text v-slider-min-text">{{ min.toFixed(decimalPlacesToBeDisplayed) }}</div>
        <div class="v-slider-meter" ref="v-slider-meter">
            <div
                class="v-slider-button"
                :style="{ left: valueElementLeftPosition }"
                @mousedown.left=onStartDragging
                @mouseup.left=onStopDragging
            ></div>
            <div
                class="v-slider-text v-slider-value-text"
                :style="{ left: valueElementLeftPosition }"
                >
                {{ value.toFixed(decimalPlacesToBeDisplayed) }}
            </div>
        </div>
        <div class="v-slider-text v-slider-max-text">{{ max.toFixed(decimalPlacesToBeDisplayed) }}</div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import MathHelpers from "@/logic/MathHelpers";

@Component
export default class VSlider extends Vue {
    @Prop({ type: Number })
    public min!: number;
    @Prop({ type: Number })
    public max!: number;
    @Prop({ type: Number })
    public step!: number;
    @Prop({ type: Number })
    public value!: number;

    private isDraggingButton: boolean = false;
    private get valueElementLeftPosition(): string {
        // our rightmost position is limited by the fact the length of the button
        // as otherwise it renders on top of the right side marker
        const rightSideUILimit: number = 0.95; // this.max - width of the button
        return rightSideUILimit * (this.value-this.min) / (this.max-this.min) * 100 + "%";
    }
    // Counts the number of decimal places in the step and makes sure
    // all number displays format using the same amount of decimal places
    private get decimalPlacesToBeDisplayed(): number {
        if (Math.floor(this.step) === this.step) return 0;
        return this.step.toString().split(".")[1].length || 0;
    }

    public mounted(): void {
        window.addEventListener("mousemove", (event: Event) => this.onDrag(event as DragEvent));
        window.addEventListener("mouseup", () => this.onStopDragging());
    }

    private onClick(event: MouseEvent): void {
        this.setPosFromAbsoluteCoordinates(event.clientX);
    }

    private onStartDragging(): void {
        this.isDraggingButton = true;
    }

    private onDrag(event: DragEvent): void {
        if (!this.isDraggingButton) {
            return;
        }
        this.setPosFromAbsoluteCoordinates(event.clientX);
    }

    private onStopDragging(): void {
        this.isDraggingButton = false;
    }

    private setPosFromAbsoluteCoordinates(absoluteX: number): void {
        const rect = (this.$refs["v-slider-meter"] as HTMLElement).getBoundingClientRect();
        const offsetXAsPercentage = (absoluteX - rect.left) / rect.width;
        const unroundedUnclampedRelativeValue = this.min + offsetXAsPercentage * (this.max - this.min);
        const unroundedClamped = MathHelpers.clamp(unroundedUnclampedRelativeValue, this.min, this.max);
        const roundedValue = Math.round(unroundedClamped / this.step) * this.step;
        this.$emit("update:value", roundedValue);
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

@meter-height: 0.4em;
@meter-width: 50%;
@slider-text-offset: 0.25em;
@button-height: 1em;
.v-slider {
    width: 100%;
    height: 1em; // This is defined by the height of the min/max texts
    margin-top: 1.5em; // This is defined by the offset of the active text
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    justify-content: space-between;
}
.v-slider-meter {
    display: inline-block;
    position: relative;
    background-color: @theme-neutral-color;
    width: @meter-width;
    height: @meter-height;
    top: -0.3 + @meter-height / 2;
    margin: 0 @slider-text-offset;
    flex: 1 1 50%;
}
.v-slider-button {
    background-color: @theme-text-color;
    width: @button-height;
    height: @button-height;
    border-radius: 50%;
    position: absolute;
    top: (@meter-height - @button-height)/2;
    &:hover {
        background-color: @theme-text-color-hover;
    }
}
.v-slider-value-text {
    position: absolute;
    top: -2em;
    width: @button-height; // Same size as the button so it aligns with it
    text-align: center;
    border-bottom: 2px solid @theme-text-color;
}
.v-slider-text {
    color: @theme-text-color;
    user-select: none;
    display: inline-block;
    user-select: auto;
}
.v-slider-max-text, .v-slider-min-text {
    flex: 0 1 auto;
}
</style>
