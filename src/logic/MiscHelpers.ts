export class Clipboard {
    public static copyToClipboard(text: string) {
        const elem = document.createElement("textarea");
        elem.value = text;
        document.body.appendChild(elem);
        elem.select();
        elem.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");
        document.body.removeChild(elem);
    }
}

// taken from here: https://stackoverflow.com/a/8260383/3162383
export function parseYouTubeVideoIdFromUrl(url: string): string|false {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : false;
}

// taken from here: https://stackoverflow.com/a/30134889
export function YouTubeDurationToSeconds(duration: string) {
    const matchArray = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    const match2 = matchArray!.slice(1).map(function (x) {
        if (x != null) { // don't change this to `!==` !!!
            return x.replace(/\D/, "");
        }
    });

    const hours = match2[0] ? parseInt(match2[0]) : 0;
    const minutes = match2[1] ? parseInt(match2[1]) : 0;
    const seconds = match2[2] ? parseInt(match2[2]) : 0;

    return hours * 3600 + minutes * 60 + seconds;
}
