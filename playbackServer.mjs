#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import process from "node:process";
import url from "node:url";
import path from "node:path";
import { WebSocketServer } from "ws";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// You can edit those:
const versionCheck = false;
const clientsideJS = true;

const wss = new WebSocketServer({ port: 8081 });

wss.on("listening", () => {
	console.log("listening on ws://localhost:8081");
	console.log("use https://narrow.one/?ip=ws://localhost:8081/YOUR_REPLAY_FILE_HERE.nnc");
});
wss.on("error", (err) => {
	if (err.code === "EADDRINUSE") {
		console.error("Error: port 8081 is already in use by something else.");
		console.error("another copy of playback server may already be running.");
	} else {
		console.error(err);
	}
	process.exit(1);
});
wss.on("connection", async (ws, req) => {
	try {
		const filepath = path.join(__dirname, "data", req.url);
		const msgs1 = await parser.parse(filepath);
		const msgs2 = unlag(msgs1);
		const msgs3 = respawnWeaponFix(msgs2)
		const preprocessor = new ReplayPreprocessor(msgs3);
		new ReplayThing(ws, preprocessor);
	} catch (e) {
		ws.close();
		console.log(e);
	}
});

const ConnectionState = {
	NOTHING_YET: 0,
	WAITING_MAP: 1,
	MAIN: 2,
	DISCONNECTED: 3
}

class RawParser {
	constructor() {
		this.index = 0;
		this.buffer = null;
		this.arrayU8 = null;
	}
	getByte() {
		return this.arrayU8[this.index++];
	}
	getVLE() {
		let out = 0;
		let mul = 1;
		let number = 0;
		do {
			number = this.arrayU8[this.index++];
			out += (number & 0x7f) * mul;
			mul *= 128;
		} while(number > 127);
		return out;
	}
	getSlice(length) {
		const slice = new Uint8Array(this.buffer, this.index, length);
		this.index += length;
		return slice;
	}
	hasMore() {
		return this.index < this.buffer.byteLength;
	}
	async readFile(filename) {
		try {
			return await fsp.readFile(filename);
		} catch(e) {
			if (e.code == "ENOENT") {
				throw `file '${filename}' was not found.`;
			} else {
				throw e;
			}
		}
	}
	async parse(filename) {
		const fileBuffer = await this.readFile(filename);
		this.index = 0;
		this.buffer = fileBuffer.buffer;
		this.arrayU8 = fileBuffer;
		let time = 0;
		const harLikeMsgs = [];
		while (this.hasMore()) {
			const timestampDelta = this.getVLE();
			const opRaw = this.getByte();
			const op = opRaw & 0x7f;
			const dir = (opRaw > 127) ? "send" : "receive";
			const messageLength = this.getVLE();
			const messageRaw = this.getSlice(messageLength);
			const message = new Uint8Array(4 + messageRaw.byteLength);
			message[0] = op;
			message.set(messageRaw, 4);
			time += timestampDelta;
			harLikeMsgs.push({
				"type": dir,
				"data": message,
				"time": time / 1000,
			});
		}
		return harLikeMsgs;
	}
}

function formatTime(timeFloat) {
	const time = Math.floor(timeFloat);
	const tmin = Math.floor(time / 60)
	const tsec = time % 60;
	return `${tmin.toString().padStart(2,"0")}:${tsec.toString().padStart(2,"0")}`;
}

/**
 * Spaces out PLAYER_DATA to be at least 50 ms apart,
 * while also shifting everything else accordingly.
 * Tries to remove network lag spikes that occured
 * while recording.
 */
function unlag(msgs) {
	let lastTime = Number.MAX_SAFE_INTEGER;
	let lastIntendedTime = Number.MAX_SAFE_INTEGER;
	for(let i=msgs.length-1; i>=0; i--) {
		const msg = msgs[i];
		const op = (new Uint32Array(msg.data.buffer, 0, 1))[0];
		if (msg.type == "receive" && op == SendAction.PLAYER_DATA) {
			lastTime = msg.time;
			lastIntendedTime = Math.min(lastTime, lastIntendedTime - 0.05);
		}
		msg.time -= lastTime - lastIntendedTime;
	}
	let minTime = 0;
	for(let i=0; i<msgs.length; i++) {
		const msg = msgs[i];
		if (msg.time > minTime) minTime = msg.time;
		if (msg.time < minTime) msg.time = minTime;
	}
	return msgs;
}

/**
 * Send PLAYER_PERFORM_ACTION FIRE_UP after respawn,
 * to prevent weapons from getting stuck in active state.
 */
function respawnWeaponFix(msgs) {
	for(let i=0; i<msgs.length; i++) {
		const msg = msgs[i];
		const op = (new Uint32Array(msg.data.buffer, 0, 1))[0];
		if (msg.type == "receive" && op == SendAction.SPAWN) {
			const mr = new MessageReader(msg.data.buffer);
			const mw = new MessageWriter();
			const op = mr.getUint32();
			const playerId = mr.getUint32();
			const newMsg = {
				"type": "receive",
				"data": mw.start(SendAction.PLAYER_PERFORM_ACTION).addUint32(playerId).addUint32(PlayerAction.FIRE_UP).ok(),
				"time": msg.time,
			}
			msgs.splice(i+1, 0, newMsg);
		}
	}
	return msgs;
}

class ReplayPreprocessor {
	constructor(msgs1) {
		let subOld = null;
		const msgs2 = [];
		let mapHash = null;
		let clientVersion = null;
		let gamemode = 1;
		let squad = "";
		let duration = 0;
		let gameSeed = 0;
		let lastFlagOpHash = "";
		const playerNames = new Map();
		for(const msg of msgs1) {
			const op = (new Uint32Array(msg.data.buffer, 0, 1))[0];
			if (msg.type == "send") {
				if (op == ReceiveAction.CREATE_ARROW) {
					msg.data.set(new Uint32Array([SendAction.CREATE_ARROW]), 0);
					msg.type = "receive";
				}
				if (op == ReceiveAction.MY_CLIENT_VERSION) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					clientVersion = mr.getString();
				}
				if (op == ReceiveAction.SQUAD_DATA) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					const data = JSON.parse(mr.getString());
					squad = data.squadId;
				}
			} else {
				if (op == SendAction.JOINED_GAME_ID) continue;
				if (op == SendAction.PLAYER_OWNERSHIP) continue;
				if (op == SendAction.GAME_END_ACCOUNT_STATS) continue;
				if (op == SendAction.GUEST_DATA_CHANGED) continue;
				if (op == SendAction.EVAL_CODE) continue;
				if (op == SendAction.LOGOUT) continue;
				if (op == SendAction.GAME_SEED) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					gameSeed = mr.getUint32();
					continue;
				}
				if (op == SendAction.GAMEMODE) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					gamemode = mr.getUint32();
					continue;
				}
				if (op == SendAction.GAME_MAP_HASH) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					mapHash = mr.getString();
					continue;
				}
				//if (op == SendAction.CREATE_ARROW && (subOld === null ? 0 : Math.floor(msg.time - subOld)) < startOffset) continue;
				if (op == SendAction.CHANGE_FLAG) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					const playerId = mr.getUint32();
					const flagId = mr.getUint32();
					const actionId = mr.getUint32();
					const flagOpHash = `${playerId} ${flagId} ${actionId}`;
					const actions = ["grabbed", "captured", "dropped", "returned"];
					const flags = ["\x1b[91mred flag ⚑", "\x1b[94mblue flag ⚑"];
					const playerName = playerNames.get(playerId);
					const time = subOld === null ? 0 : Math.floor(msg.time - subOld);
					const color = 31 + playerId % 6 + (Math.floor(playerId / 6) % 2) * 60;
					if (flagOpHash !== lastFlagOpHash) {
						lastFlagOpHash = flagOpHash;
						console.log(`${formatTime(time)} \x1b[${color}m${playerName}\x1b[0m ${actions[actionId]} the ${flags[flagId]}\x1b[0m.`);
					}
				}
				if (op == SendAction.CHAT_MESSAGE) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					const data = JSON.parse(mr.getString());
					const time = subOld === null ? 0 : Math.floor(msg.time - subOld);
					const color = 31 + data.data.playerId % 6 + (Math.floor(data.data.playerId / 6) % 2) * 60;
					console.log(`${formatTime(time)} \x1b[${color}m${playerNames.get(data.data.playerId)}\x1b[0m> ${data.data.message}`);
				}
				if (op == SendAction.PLAYER_NAME) {
					const mr = new MessageReader(msg.data.buffer);
					const op = mr.getUint32();
					const playerId = mr.getUint32();
					const name = mr.getString();
					playerNames.set(playerId, name);
				}
			}
			if (msg.type == "send") continue;

			if (subOld === null) subOld = msg.time;

			msg.time = (msg.time - subOld) * 1000;
			if (msg.time > duration) duration = msg.time;
			msgs2.push(msg);
		}
		this.messages = msgs2;
		this.clientVersion = clientVersion;
		this.mapHash = mapHash;
		this.squadCode = squad;
		this.duration = duration;
		this.gamemode = gamemode;
		this.gameSeed = gameSeed;
	}
}

class SendScheduler {
	constructor(ws, msgs, duration) {
		this.ws = ws;
		this.index = 0;
		this.sentIndex = 0;
		this.msgs = msgs;
		this.start = Date.now();
		this.stopped = false;
		this.stoppedAt = 0;
		this.duration = duration;
		this.logInterval = setInterval(this.log.bind(this), 1000);
		this.timeouts = new Set();
		this.next();
	}
	unschedule() {
		this.index = this.sentIndex;
		this.timeouts.forEach(clearTimeout);
		this.timeouts.clear();
	}
	fastForward(amount) {
		this.unschedule();
		this.start -= amount;
		this.next();
	}
	now() {
		return Date.now() - this.start;
	}
	next() {
		if (this.stopped) return;
		const ws = this.ws;
		const msgs = this.msgs;
		const start = this.start;
		const upUntil = Date.now() - start + 5000;
		let total = 0;
		while(this.index < msgs.length && msgs[this.index].time < upUntil) {
			const msg = msgs[this.index];
			const timeout = setTimeout(() => {
				this.timeouts.delete(timeout);
				ws.send(msg.data);
				this.sentIndex++;
				this.next();
			}, msg.time + start - Date.now());
			this.timeouts.add(timeout);
			//console.log("Scheduled", this.index, "data", msg.data, "in", msg.time - Date.now());
			this.index++;
			total++;
		}
		//console.log("End of schedule", this.index < msgs.length ? msgs[this.index].time : null, upUntil, "after", total);
	}
	log() {
		const time = Math.floor(this.msgs[Math.min(this.index, this.msgs.length-1)].time / 1000);
		const maxTime = Math.floor(this.duration / 1000);
		const progress = Math.floor(time / maxTime * 100);
		const bar = "#".repeat(progress) + " ".repeat(100 - progress);
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`[${bar}] ${formatTime(time)}/${formatTime(maxTime)} ${progress}%`);
	}
	stop() {
		if (this.stopped) return;
		this.unschedule();
		this.stopped = true;
		this.stoppedAt = Date.now() - this.start;
		clearInterval(this.logInterval);
	}
	resume() {
		if (!this.stopped) return;
		this.stopped = false;
		this.start = Date.now() - this.stoppedAt;
		this.logInterval = setInterval(this.log.bind(this), 1000);
		this.next();
	}
}

class ReplayThing {
	constructor(ws, preprocessor) {
		this.gameId = 0;
		this.mapHash = preprocessor.mapHash;
		this.gamemode = preprocessor.gamemode;
		this.clientVersion = preprocessor.clientVersion;
		this.preprocessor = preprocessor;
		this.squadCode = preprocessor.squadCode;
		this.gameSeed = preprocessor.gameSeed;

		this.state = ConnectionState.NOTHING_YET;
		this.startTime = 0;
		this.id = 99;
		this.flyEnabled = false;
		this.selectedClass = 0;
		this.selectedWeapon = 0;
		this.equippedSkinData = "";
		this.spawnId = 0;
		this.ws = ws;
		this.sendScheduler = null;
		ws.on("message", this.handle.bind(this));
		ws.on("close", this.disconnect.bind(this));
	}
	disconnect() {
		if (this.sendScheduler) this.sendScheduler.stop();
		//TODO
	}
	handle(buffer) {
		let bin = new Uint8Array(buffer.length);
		buffer.copy(bin);
		let mr = new MessageReader(bin.buffer);
		let mw = new MessageWriter();

		let ws = this.ws;
		let op = mr.getUint32();

		if (op == ReceiveAction.REQUEST_JOIN_GAME_ID) {
			if (this.state !== ConnectionState.NOTHING_YET) return;
			this.state = ConnectionState.WAITING_MAP;
			ws.send(mw.start(SendAction.JOINED_GAME_ID).addUint32(this.gameId).ok());
			ws.send(mw.start(SendAction.GAMEMODE).addString(this.gamemode).ok());
			ws.send(mw.start(SendAction.GAME_MAP_HASH).addString(this.mapHash).ok());
			ws.send(mw.start(SendAction.GAME_SEED).addUint32(this.gameSeed).ok());
		}
		if (op == ReceiveAction.CURRENT_LOADED_MAP_HASH) {
			if (this.state !== ConnectionState.WAITING_MAP) return;
			this.state = ConnectionState.MAIN;
			this.startTime = Date.now();
			ws.send(mw.start(SendAction.CREATE_PLAYER).addUint32(this.id).ok());
			ws.send(mw.start(SendAction.PLAYER_TEAM_ID).addUint32(this.id).addUint32(4).ok());
			ws.send(mw.start(SendAction.PLAYER_NAME).addUint32(this.id).addString("Spectator").ok());
			ws.send(mw.start(SendAction.PLAYER_SCORES).addUint32(this.id).addUint32(0).addUint32(0).addUint32(0).addUint32(0).addUint32(0).addUint32(0).ok());
			ws.send(mw.start(SendAction.UPDATE_PLAYER_FLY_ENABLED).addUint32(this.flyEnabled).addUint32(this.id).ok())
			ws.send(mw.start(SendAction.CHANGE_SELECTED_CLASS).addUint32(this.id).addUint32(this.selectedClass).ok());
			ws.send(mw.start(SendAction.ACTIVE_WEAPON_TYPE).addUint32(this.id).addUint32(this.selectedWeapon).ok());
			ws.send(mw.start(SendAction.EQUIPPED_SKIN_DATA).addUint32(this.id).addString(this.equippedSkinData).ok());
			ws.send(mw.start(SendAction.PLAYER_NAME_VERIFIED).addUint32(this.id).ok()); // Why not :)
			ws.send(mw.start(SendAction.PLAYER_OWNERSHIP).addUint32(this.id).addUint32(true).ok());
			ws.send(mw.start(SendAction.SPAWN).addUint32(this.id).addUint32(this.spawnId).addUint32(this.spawnId).ok());
			ws.send(mw.start(SendAction.SQUAD_ID_RESPONSE).addString(this.squadCode).ok());

			this.sendScheduler = new SendScheduler(ws, this.preprocessor.messages, this.preprocessor.duration);
		}

		if (op == ReceiveAction.PLAYER_FLY_SETTING_ENABLED) {
			const enabled = mr.getUint32() > 0;
			ws.send(mw.start(SendAction.UPDATE_PLAYER_FLY_ENABLED).addUint32(enabled).addUint32(this.id).ok());
		}
		if (op == ReceiveAction.MY_CLIENT_VERSION) {
			const gameVersion = mr.getString();
			if (gameVersion !== this.clientVersion && versionCheck) {
				console.log(gameVersion, "vs", this.clientVersion);
				ws.send(mw.start(SendAction.DISCONNECT_REASON).addUint32(DisconnectReason.VERSION_OUT_OF_DATE).ok());
				ws.close();
			}
		}
		if (op == ReceiveAction.CHANGE_SELECTED_CLASS) {
			const playerId = mr.getUint32();
			this.selectedClass = mr.getUint32();
			ws.send(mw.start(SendAction.CHANGE_SELECTED_CLASS).addUint32(this.id).addUint32(this.selectedClass).ok());
		}
		if (op == ReceiveAction.ACTIVE_WEAPON_TYPE) {
			const playerId = mr.getUint32();
			this.selectedWeapon = mr.getUint32();
			ws.send(mw.start(SendAction.ACTIVE_WEAPON_TYPE).addUint32(this.id).addUint32(this.selectedWeapon).ok());
		}
		if (op == ReceiveAction.EQUIPPED_SKIN_DATA) {
			this.equippedSkinData = mr.getString();
			ws.send(mw.start(SendAction.EQUIPPED_SKIN_DATA).addUint32(this.id).addString(this.equippedSkinData).ok());
		}


		if (this.state !== ConnectionState.MAIN) return;


		if (op == ReceiveAction.PLAYER_PERFORM_ACTION) {
			const playerId = mr.getUint32();
			const actionId = mr.getUint32();
			ws.send(mw.start(SendAction.PLAYER_PERFORM_ACTION).addUint32(playerId).addUint32(actionId).ok());
		}
		if (op == ReceiveAction.SPAWN) {
			const playerId = mr.getUint32();
			const spawnId = mr.getUint32();
			ws.send(mw.start(SendAction.SPAWN).addUint32(playerId).addUint32(spawnId).ok());
		}
		if (op == ReceiveAction.REQUEST_SPAWN) {
			const playerId = mr.getUint32();
			ws.send(mw.start(SendAction.SPAWN).addUint32(playerId).addUint32(0).addUint32(0).ok());
		}
		if (op == ReceiveAction.CHAT_MESSAGE) {
			const message = mr.getString();
			const data = {
				"type": "playerMessage",
				"data": {
					"playerId": this.id,
					"message": message
				}
			};
			if (message[0] == "/") {
				const parts = message.slice(1).split(" ");
				if (parts[0] == "skip") {
					const msToSkip = Math.max(0, (+parts[1] || 0) * 1000 * 60);
					this.sendScheduler.fastForward(msToSkip);
					if (clientsideJS) ws.send(mw.start(SendAction.EVAL_CODE).addJSON({id:0, c:`main.now+=${msToSkip};main.gameManager.activeGame.appearingObjectsManager.loop(0,${msToSkip});`}).ok());
				}
				if (parts[0] == "skipto") {
					const msToSkip = Math.max(0, (+parts[1] || 0) * 1000 * 60 - this.sendScheduler.now());
					this.sendScheduler.fastForward(msToSkip);
					if (clientsideJS) ws.send(mw.start(SendAction.EVAL_CODE).addJSON({id:0, c:`main.now+=${msToSkip};main.gameManager.activeGame.appearingObjectsManager.loop(0,${msToSkip});`}).ok());
				}
				if (parts[0] == "stop") {
					this.sendScheduler.stop();
				}
				if (parts[0] == "resume") {
					this.sendScheduler.resume();
				}
				if (parts[0] == "getskin" && clientsideJS) {
					ws.send(mw.start(SendAction.EVAL_CODE).addJSON({id:0, c:`
const activeGame = main.gameManager.activeGame;
const myPlayer = activeGame.getMyPlayer();
const camera = main.cam.cam;

function notification(text) {
    const notifUI = activeGame.scoreOffsetNotificationsUi;
    const innerDiv = document.createElement("div");
    innerDiv.classList.add("scoreOffsetNotificationAnim");
    innerDiv.style.animation = "1s notificationIconFade 2s both, 0.2s notificationIconPop";
    innerDiv.appendChild(document.createTextNode(text));
    const outerDiv = document.createElement("div");
    outerDiv.classList.add("scoreOffsetNotification");
    outerDiv.appendChild(innerDiv);
    notifUI.listEl.appendChild(outerDiv);
    notifUI.createdNotifications.unshift({
        el: outerDiv,
        destroyTime: Date.now() + 3000
    });
    notifUI.destroyOldNotifications();
    notifUI.updateNotificationOffsets();
}

let minDistance = Infinity, minPlayer = null;
for(const player of activeGame.players.values()) {
    if (player === myPlayer) continue;
    const ndcPos = player.pos.clone();
    ndcPos.y += 1;
    ndcPos.project(camera);
    const distance = Math.sqrt(ndcPos.x * ndcPos.x + ndcPos.y * ndcPos.y);
    if (distance < minDistance && Math.abs(ndcPos.z) < 1) {
        minDistance = distance;
        minPlayer = player;
    }
}
if (minPlayer === null) {
	notification("no players found");
} else {
	main.skins.skinPresets.push(minPlayer.equippedSkinData);
	main.skins.savePresets();
	main.skins.fireConfigChanged();
	notification(minPlayer.playerName + "'s skin was added");
}
`}).ok());
				}
				return;
			}
			ws.send(mw.start(SendAction.CHAT_MESSAGE).addJSON(data).ok());
		}
		if (op == ReceiveAction.REQUEST_SQUAD_ID) {
			ws.send(mw.start(SendAction.SQUAD_ID_RESPONSE).addString("NSQD").ok());
			//ws.send(mw.start(SendAction.SQUAD_JOIN_ERROR_RESPONSE).addString("Not supported for replays").ok());
		}
	}
}

const SendAction = {
	JOINED_GAME_ID: 0,
	CREATE_PLAYER: 1,
	DESTROY_PLAYER: 2,
	PLAYER_OWNERSHIP: 3,
	PLAYER_DATA: 4,
	CREATE_ARROW: 5,
	CHANGE_FLAG: 6,
	SCOREBOARD: 7,
	FLAG_POSITION: 8,
	PING: 9,
	PLAYER_PING_DATA: 10,
	GAME_END: 11,
	CLAIM_HIT_BY_ARROW: 12,
	DISCONNECT_REASON: 13,
	GAME_MAP_HASH: 14,
	PLAYER_PERFORM_ACTION: 15,
	PLAYER_NAME: 16,
	PLAYER_SCORES: 17,
	CHANGE_SELECTED_CLASS: 18,
	GAME_START: 19,
	RECONNECT_TOKEN: 20,
	EQUIPPED_SKIN_DATA: 21,
	OFFSET_PLAYER_SCORE: 22,
	GAME_END_ACCOUNT_STATS: 23,
	GUEST_DATA_CHANGED: 24,
	PLAYER_TEAM_ID: 25,
	SAME_SQUAD_PLAYERS: 26,
	SQUAD_ID_RESPONSE: 27,
	SQUAD_JOIN_ERROR_RESPONSE: 28,
	REQUEST_MAP_HASH: 29,
	GAME_TIME: 30,
	PLAYER_NAME_VERIFIED: 31,
	GAME_SEED: 32,
	SET_PLAYER_HEALTH: 33,
	CHAT_MESSAGE: 34,
	SPAWN: 35,
	SAME_SQUAD_PLAYER_DATA: 36,
	ACTIVE_WEAPON_TYPE: 37,
	HIT_VALIDATION_DATA: 38,
	MELEE_HIT_PLAYER: 39,
	AVG_TEAM_ELO: 40,
	ARROW_HIT_PLAYER: 41,
	PLAYER_KILL_PLAYER: 42,
	SCORE_TIMER_STATE: 43,
	UPDATE_PLAYER_FLY_ENABLED: 44,
	EVAL_CODE: 55,
	GAMEMODE: 56,
	LOGOUT: 61,
}
const ReceiveAction = {
	MY_CLIENT_VERSION: 0,
	REQUEST_JOIN_GAME_ID: 1,
	PLAYER_DATA: 2,
	CREATE_ARROW: 3,
	CHANGE_FLAG: 4,
	PONG: 5,
	CURRENT_LOADED_MAP_HASH: 6,
	CLAIM_HIT_BY_ARROW: 7,
	REQUEST_MAP_HASH: 8,
	PLAYER_PERFORM_ACTION: 9,
	CHANGE_SELECTED_CLASS: 10,
	MY_SKILL_LEVEL: 11,
	REQUEST_NEXT_GAME_STATE: 12,
	RECONNECT_TOKEN: 13,
	EQUIPPED_SKIN_DATA: 14,
	FLAG_RETURN_PROGRESS: 15,
	ACCOUNT_SESSION_DATA: 16,
	SQUAD_ID: 17,
	REQUEST_SQUAD_ID: 18,
	MAP_BOUNDS: 19,
	DEFAULT_FLAG_POSITIONS: 20,
	REPORT_CHEATER: 21,
	VALID_ARROW_HIT: 22,
	CHAT_MESSAGE: 23,
	SPAWN: 24,
	SQUAD_DATA: 25,
	ACTIVE_WEAPON_TYPE: 26,
	MELEE_HIT_PLAYER: 27,
	REQUEST_TEAM_SWITCH: 28,
	DEFAULT_SPAWN_POSITIONS: 29,
	SQUAD_LEADER_REQUESTS_GAME_EXIT: 30,
	PLAYER_FLY_SETTING_ENABLED: 31,
	EVAL_RESPONSE: 32,
	REQUEST_SPAWN: 35,
}
const DisconnectReason = {
	UNKNOWN: 0,
	VERSION_OUT_OF_DATE: 1,
	AFK: 2,
	GAME_DOESNT_EXIST: 3,
	PING_TOO_HIGH: 4,
	SUSPECTED_CHEATER: 5,
	TEMPORARILY_BANNED: 6,
	INVALID_RECONNECT_TOKEN: 7,
	OTHER_CONNECTION_OPENED: 8,
	SQUAD_LEADER_REQUESTED_GAME_EXIT: 9,
};
const PlayerAction = {
	JUMP: 0,
	FIRE_DOWN: 1,
	FIRE_UP: 2,
	SPAWN: 3,
	DIE: 4,
};

class MessageWriter {
	constructor(size=4096) {
		let buffer = new ArrayBuffer(size);
		this.buffer = buffer;
		this.bufferU8 = new Uint8Array(buffer);
		this.dataView = new DataView(buffer);
		this.index = 0;
	}
	start(command) {
		this.index = 0;
		this.addUint32(command);
		return this;
	}
	addUint32(numValue) {
		this.dataView.setUint32(this.index, +numValue, true);
		this.index += 4;
		return this;
	}
	addUint16(numValue) {
		this.dataView.setUint16(this.index, +numValue, true);
		this.index += 2;
		return this;
	}
	addUint8(numValue) {
		this.dataView.setUint8(this.index, +numValue, true);
		this.index += 1;
		return this;
	}
	addFloat32(numValue) {
		this.dataView.setFloat32(this.index, +numValue, true);
		this.index += 4;
		return this;
	}
	addString(string) {
		let encoded = (new TextEncoder).encode(string);
		let length = encoded.length;
		let offsetLength = Math.ceil(length / 4) * 4;
		let extra = offsetLength - length;
		
		let i = this.index;
		this.dataView.setUint32(i, length, true);
		i += 4;
		this.bufferU8.set(encoded, i);
		this.bufferU8.set(new Uint8Array(extra), i+length);
		i += offsetLength;
		this.index = i;
		return this;
	}
	addJSON(object) {
		this.addString(JSON.stringify(object));
		return this;
	}
	addZeros(amount) {
		this.bufferU8.set(new Uint8Array(amount), this.index);
		this.index += amount;
		return this;
	}
	addBytes(array) {
		this.bufferU8.set(new Uint8Array(array), this.index);
		this.index += array.length;
		return this;
	}
	ok() {
		return this.buffer.slice(0, this.index);
	}
	copy() {
		const copy = new ArrayBuffer(this.buffer.byteLength);
		new Uint8Array(copy).set(this.bufferU8);
		return copy;
	}
}

class MessageReader {
	constructor(buffer) {
		this.buffer = buffer;
		this.dataView = new DataView(buffer);
		this.index = 0;
	}
	getUint8() {
		let res = this.dataView.getUint8(this.index, true);
		this.index += 1;
		return res;
	}
	getUint16() {
		let res = this.dataView.getUint16(this.index, true);
		this.index += 2;
		return res;
	}
	getUint32() {
		let res = this.dataView.getUint32(this.index, true);
		this.index += 4;
		return res;
	}
	getInt32() {
		let res = this.dataView.getInt32(this.index, true);
		this.index += 4;
		return res;
	}
	getFloat32() {
		let res = this.dataView.getFloat32(this.index, true);
		this.index += 4;
		return res;
	}
	getString() {
		let length = this.dataView.getInt32(this.index, true);
		this.index += 4;
		let res = (new TextDecoder()).decode(new Uint8Array(this.buffer, this.index, length));
		this.index += Math.ceil(length / 4) * 4;
		return res;
	}
	getBytes(length) {
		let output = new Uint8Array(length);
		let slice = new Uint8Array(this.buffer, this.index, length);
		output.set(slice);
		this.index += length;
		return output;
	}
}

const parser = new RawParser();
