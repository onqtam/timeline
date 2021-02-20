import { Channel, Episode } from "@/logic/entities/Channel";
import AsyncLoader from "@/client/utils/AsyncLoader";
import CommonParams from "@/logic/CommonParams";
import { HTTPVerb } from "@/logic/HTTPVerb";
import { ActionContext } from "vuex";

export interface IStoreChannelModule {
    allChannels: Channel[];
    findEpisode(channelTitleURL: string, episodeTitleURL: string): Episode|undefined;
}

export class StoreChannelViewModel implements IStoreChannelModule {
    public allChannels!: Channel[];

    constructor() {
        this.allChannels = [];
    }

    public findEpisode(channelTitleURL: string, episodeTitleURL: string): Episode|undefined {
        const channel: Channel|undefined = this.allChannels.find(p => p.titleAsURL === channelTitleURL);
        return channel?.episodes.find(e => e.titleAsURL === episodeTitleURL);
    }

    public updateChannelData(newChannelData: Channel[]): void {
        this.allChannels.splice(0, this.allChannels.length, ...newChannelData);
    }

    public async loadChannelData(): Promise<Channel[]> {
        const restURL: string = `${CommonParams.APIServerRootURL}/channels`;
        const fetchPromise = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null, Channel) as Promise<Channel[]>;
        return fetchPromise;
    }

    public async loadEpisodeData(channelTitleURL: string, episodeTitleURL: string): Promise<Episode|undefined> {
        const restURL: string = `${CommonParams.APIServerRootURL}/episodes/${channelTitleURL}/${episodeTitleURL}`;
        const fetchPromise = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null, Episode) as Promise<Episode|undefined>;
        return fetchPromise;
    }
}

const channelModule = new StoreChannelViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: channelModule,
    mutations: {
        // Update the channel data in the store;
        // Don't call this directly; use the refreshChannelData action instead
        internalUpdateChannelData: (state: StoreChannelViewModel, newChannels: Channel[]): void => {
            state.updateChannelData(newChannels);
        }
    },
    actions: {
        refreshChannelData: async (context: ActionContext<StoreChannelViewModel, StoreChannelViewModel>): Promise<void> => {
            return context.state.loadChannelData()
                .then(channels => {
                    // Call the type-unsafe commit; We could call the function directly but this triggers
                    // warnings about modifying state outside of commits
                    context.commit("internalUpdateChannelData", channels);
                });
        },
        initChannelData: async (context: ActionContext<StoreChannelViewModel, StoreChannelViewModel>): Promise<void> => {
            if (context.state.allChannels.length !== 0) {
                return;
            }
            return context.dispatch("refreshChannelData");
        },
        loadEpisodeData: async (context: ActionContext<StoreChannelViewModel, StoreChannelViewModel>, payload: { channelURL: string; episodeURL: string }): Promise<Episode|undefined> => {
            const episodeData: Episode|undefined = context.state.findEpisode(payload.channelURL, payload.episodeURL);
            if (episodeData) {
                return episodeData;
            }
            return context.state.loadEpisodeData(payload.channelURL, payload.episodeURL);
        }
    }
};
