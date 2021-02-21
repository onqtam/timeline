import store from "@/client/store";

export enum ActiveAppMode {
    LargeDesktop, // Generally 4k+
    StandardScreen, // Laptops and small screens (e.g. Full HD)
    Tablet, // e.g. 1280x960
    Mobile, // Usually portrait mode
}

export class DeviceInfo {
    public deviceName!: string;
    public screenWidth!: number;
    public screenHeight!: number;
    public get aspectRatio(): number {
        return this.screenWidth / this.screenHeight;
    }
    public appMode!: ActiveAppMode;
}

export interface IStoreDeviceInfoModule {
    device: DeviceInfo;
}

export enum BrowserType {
    Edge = "Edge",
    Opera = "Opera",
    Chrome = "Google Chrome",
    InternetExplorer = "Internet Explorer",
    Firefox = "Mozilla Firefox",
    Safari = "Safari",
    Unknown = "Unknown Browser"
}

export type AppModeChangedCallback = () => void;

export class StoreDeviceInfoViewModel implements IStoreDeviceInfoModule {
    public device: DeviceInfo;
    private appModeChangedPlayers: AppModeChangedCallback[];

    constructor() {
        this.device = new DeviceInfo();
        this.device.deviceName = StoreDeviceInfoViewModel.extractBrowserName();
        this.appModeChangedPlayers = [];
        this.updateDeviceScreenDimensions();
    }

    public setup() {
        window.addEventListener("resize", store.commit.device.updateDeviceScreenDimensions);
    }

    // TODO: Move to the SimpleEvent library
    public addOnAppModeChangedPlayer(callback: () => void): void {
        this.appModeChangedPlayers.push(callback);
    }
    public removeOnAppModeChangedPlayer(callback: () => void): void {
        const indexOfCallback: number = this.appModeChangedPlayers.indexOf(callback);
        this.appModeChangedPlayers[indexOfCallback] = this.appModeChangedPlayers[this.appModeChangedPlayers.length - 1];
        this.appModeChangedPlayers.pop();
    }

    public updateDeviceScreenDimensions(): void {
        this.device.screenWidth = window.innerWidth;
        this.device.screenHeight = window.innerHeight;
        if (this.device.screenWidth >= 2560) {
            this.device.appMode = ActiveAppMode.LargeDesktop;
        } else if (this.device.screenWidth >= 1600) {
            this.device.appMode = ActiveAppMode.StandardScreen;
        } else if (this.device.screenWidth >= 1000) {
            this.device.appMode = ActiveAppMode.Tablet;
        } else {
            this.device.appMode = ActiveAppMode.Mobile;
        }

        for (const callback of this.appModeChangedPlayers) {
            callback();
        }
    }

    private static extractBrowserName(): BrowserType {
        const agent: string = window.navigator.userAgent.toLowerCase();
        const windowAsAny = window as unknown as Record<string, string>;
        switch (true) {
        case agent.indexOf("edg") > -1: return BrowserType.Edge;
        case agent.indexOf("opr") > -1 && !!windowAsAny.opr: return BrowserType.Opera;
        case agent.indexOf("chrome") > -1 && !!windowAsAny.chrome: return BrowserType.Chrome;
        case agent.indexOf("trident") > -1: return BrowserType.InternetExplorer;
        case agent.indexOf("firefox") > -1: return BrowserType.Firefox;
        case agent.indexOf("safari") > -1: return BrowserType.Safari;
        default: return BrowserType.Unknown;
        };
    }
}

const DeviceModule = new StoreDeviceInfoViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: DeviceModule,
    mutations: {
        addOnAppModeChangedPlayer: (state: StoreDeviceInfoViewModel, player: AppModeChangedCallback): void => {
            state.addOnAppModeChangedPlayer(player);
        },
        removeOnAppModeChangedPlayer: (state: StoreDeviceInfoViewModel, player: AppModeChangedCallback): void => {
            state.removeOnAppModeChangedPlayer(player);
        },
        updateDeviceScreenDimensions: (state: StoreDeviceInfoViewModel): void => {
            state.updateDeviceScreenDimensions();
        }
    }
};
