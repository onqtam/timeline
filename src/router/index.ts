import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Home from "../views/Home.vue";
import ListenView from "../views/Listen.vue";
import Timepoint from "@/logic/Timepoint";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
    {
        path: "/home",
        name: "Home",
        component: Home
    },
    {
        path: "/about",
        name: "About",
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ "../views/About.vue")
    },
    {
        path: "/listen",
        name: "Listen",
        component: ListenView,
        props: (route) => ({
            initialTimepoint: Timepoint.tryParseFromURL(route.query.t as string),
            threadIdToFocus: ~~(route.query.thread as string)
        })
    },
    {
        path: "/",
        redirect: { name: "Listen" }
    }
];

const router = new VueRouter({
    routes
});

export default router;
