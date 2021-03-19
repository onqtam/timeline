import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import PlayView from "../views/Play.vue";
import EpisodesView from "../views/Episodes.vue";
import ChannelsView from "../views/Channels.vue";
import UserView from "../views/User.vue";
import HomeView from "../views/Home.vue";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
    {
        path: "/about",
        name: "About",
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        // TODO: look at and think about this ^^
        component: () => import(/* webpackChunkName: "about" */ "../views/About.vue")
    },
    {
        path: "/play/:episodeId",
        name: "Play",
        component: PlayView,
        props: (route) => ({
            threadIdToFocus: ~~route.query.thread,
            episodeIdURL: ~~route.params.episodeId
        })
    },
    {
        path: "/channels/:channelId",
        name: "Episodes",
        component: EpisodesView,
        props: (route) => ({
            channelId: ~~route.params.channelId
        })
    },
    {
        path: "/channels",
        name: "Channels",
        component: ChannelsView,
        props: true
    },
    {
        path: "/user/:userId",
        name: "user",
        component: UserView,
        props: (route) => ({
            userId: ~~route.params.userId
        })
    },
    {
        path: "/",
        name: "Home",
        component: HomeView
    },
    {
        // TODO: perhaps a 404 page?
        path: "*",
        redirect: "/"
    }
];

const router = new VueRouter({
    mode: "history",
    routes
});

export default router;
