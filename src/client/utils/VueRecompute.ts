// Extends Vue with a recompute function which triggers an update on computed vars

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias, no-unused-expressions */
import Vue from "vue";

export function installVueRecompute() {
    Vue.prototype.$markRecomputable = function markRecomputable(propName: string): void {
        const vm: Vue = this;
        const vueAsAny: any = vm as any;
        if (!vm.$options.computed) {
            console.error("Can't mark recomputable a non-existing property: ", propName);
            return;
        }
        // handle non-existent props.
        if (!vueAsAny.$__recomputables) {
            vueAsAny.$__recomputables = {};
        }
        if (!vueAsAny.$__recomputables[propName]) {
            const actualCallback = vm.$options.computed[propName] as { get: (() => any); set: (() => any) };
            if (!actualCallback) {
                console.error("Can't mark recomputable a non-existing property: ", propName);
                return;
            }
            const reactiveBackdoor = Vue.observable({
                backdoor: 0
            });
            vueAsAny.$__recomputables[propName] = {
                actualCallback,
                reactiveBackdoor
            };
            vm.$options.computed[propName] = function () {
                vueAsAny.$__recomputables[propName].reactiveBackdoor.backdoor; // referencing is sufficient
                return actualCallback.get.call(vm);
            };
        }
    };

    Vue.prototype.$destroyRecomputables = function destroyRecomputable(): void {
        const vm: Vue = this;
        const vueAsAny: any = vm as any;
        if (!vueAsAny.$__recomputables) {
            return;
        }
        for (const prop in vueAsAny.$__recomputables) {
            const recomputable = vueAsAny.$__recomputables[prop];
            vm.$options.computed![prop] = recomputable.actualCallback;
            delete vueAsAny.$__recomputables[prop];
        }
    };
    Vue.mixin({
        methods: {
            $recompute: function recompute(propName: string) {
                const vm: Vue = this;
                const vueAsAny: any = vm as any;
                if (!vueAsAny.$__recomputables || !vueAsAny.$__recomputables[propName]) {
                    return;
                }
                vueAsAny.$__recomputables[propName].reactiveBackdoor.backdoor++;
            }
        }
    });
}
