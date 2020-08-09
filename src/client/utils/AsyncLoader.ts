export default class AsyncLoader {
    public static async fetchTextFile(url: string): Promise<string> {
        const xhr = new XMLHttpRequest();

        const promise = new Promise<string>((resolve, reject) => {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(xhr.status);
                    }
                }
            };
        });

        xhr.open("GET", url, true);
        xhr.send();
        return promise;
    }
}
