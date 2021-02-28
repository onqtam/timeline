export class Clipboard {
    public static copyToClipboard(text: string) {
        const elem = document.createElement('textarea');
        elem.value = text;
        document.body.appendChild(elem);
        elem.select();
        elem.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand('copy');
        document.body.removeChild(elem);
    }
}
