// ==UserScript==
// @name         Replay Recorder Client [Tampermonkey Edition]
// @namespace    http://tampermonkey.net/
// @version      2026-01-13
// @description  Record Narrow One matches to view them later
// @author       Xeltalliv
// @match        https://narrow.one/*
// @icon         https://www.svgrepo.com/show/72558/replay-symbol.svg
// @grant        none
// ==/UserScript==

// Replay mod consists of 3 parts:
// - Recorder client <-- this script
// - Recorder server
// - Playback server

const GAME_SERVER_URL = "narrow-one.com/ws";
const RECORDER_SERVER_URL = "ws://localhost:8080/";

const State = {
    CONNECTING: 0,
    OPEN: 1,
    ENDED: 2,
};
const Direction = {
    SERVER_TO_CLIENT: 0,
    CLIENT_TO_SERVER: 1,
};

function toVLE(number) {
    const outBytes = [];
    do {
        if (outBytes.length) outBytes[outBytes.length-1] += 128;
        outBytes.push(number % 128);
        number = Math.floor(number / 128);
    } while(number > 0);
    return new Uint8Array(outBytes);
}

class ReplayRecorder {
    constructor(ws, wsReplay) {
        this.ws = ws;
        this.wsReplay = wsReplay;
        this.state = State.CONNECTING;
        this.replayBuffer = new ArrayBuffer(4096);
        this.replayIndex = 0;
        this.replayLastTime = 0;
        this.queue = [];
        this.setupReplayConnection();
        this.setupHooks();
    }
    setupReplayConnection() {
        if (!this.wsReplay) {
            this.state = State.ENDED;
            return;
        }
        this.wsReplay.binaryType = "arraybuffer";
        this.wsReplay.addEventListener("open", (event) => {
            while (this.queue.length > 0) this.wsReplay.send(this.queue.shift());
            this.state = State.OPEN;
        });
        this.wsReplay.addEventListener("close", (event) => {
            this.wsReplay = null;
            this.state = State.ENDED;
        });
        this.wsReplay.addEventListener("error", (event) => {
            this.wsReplay = null;
            this.state = State.ENDED;
        });
    }
    setupHooks() {
        this.ws.addEventListener = new Proxy(this.ws.addEventListener, {
            apply: (target, thisArg, args) => {
                if (args[0] == "message") {
                    const callback = args[1];
                    args[1] = (event) => {
                        this.writeReplay(event.data, Direction.SERVER_TO_CLIENT);
                        callback(event);
                    };
                }
                return target.apply(thisArg, args);
            },
        });
        this.ws.addEventListener("close", (event) => {
            this.sendChunk();
            if (this.wsReplay) this.wsReplay.close();
        });
        this.ws.addEventListener("error", (event) => {
            this.sendChunk();
            if (this.wsReplay) this.wsReplay.close();
        });
        this.ws.send = new Proxy(this.ws.send, {
            apply: (target, thisArg, args) => {
                this.writeReplay(args[0], Direction.CLIENT_TO_SERVER);
                return target.apply(thisArg, args);
            },
        });
    }
    writeReplay(message, direction) {
        const now = Date.now();
        if (ArrayBuffer.isView(message)) message = message.buffer;

        const timestampU8 = toVLE(now - this.replayLastTime);
        const messageU8 = new Uint8Array(message, 4);
        const messageOP = (new Uint8Array(message))[0] + direction * 128;
        const messageLengthU8 = toVLE(messageU8.byteLength);
        if (messageOP == 144) return; // Do not record ACCOUNT_SESSION_DATA
        if (messageOP == 24) return; // Do not record GUEST_DATA_CHANGED
        if (messageOP == 55) return; // Waste of space
        if (messageOP == 160) return; // Waste of space
        this.replayLastTime = now;

        const myByteLength = timestampU8.byteLength + 1 + messageLengthU8.byteLength + messageU8.byteLength
        const myBuffer = new Uint8Array(myByteLength);
        myBuffer[0] = messageOP;
        let index = 0;
        myBuffer.set(timestampU8, index); index += timestampU8.byteLength;
        myBuffer[index] = messageOP; index += 1;
        myBuffer.set(messageLengthU8, index); index += messageLengthU8.byteLength;
        myBuffer.set(messageU8, index); index += messageU8.byteLength;

        if (this.replayIndex + myByteLength > this.replayBuffer.byteLength) {
            this.sendChunk();
        }
        const replayBuffer = new Uint8Array(this.replayBuffer);
        replayBuffer.set(myBuffer, this.replayIndex);
        this.replayIndex += myByteLength;
    }
    sendChunk() {
        if (this.replayIndex == 0) return;
        if (this.state == State.CONNECTING) {
            this.queue.push(new Uint8Array(this.replayBuffer.slice(), 0, this.replayIndex));
        }
        if (this.state == State.OPEN && this.wsReplay.readyState === WebSocket.OPEN) {
            this.wsReplay.send(new Uint8Array(this.replayBuffer, 0, this.replayIndex));
        }
        this.replayIndex = 0;
    }
}

window.WebSocket = new Proxy(window.WebSocket, {
    construct: (target, args) => {
        const ws = new target(...args);
        if (args[0].includes(GAME_SERVER_URL)) {
            const wsReplay = new target(RECORDER_SERVER_URL);
            const recorder = new ReplayRecorder(ws, wsReplay);
        }
        return ws;
    },
});
window.ReplayRecorderVersion = "1.6";
