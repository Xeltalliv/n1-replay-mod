#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });
console.log("listening on ws://localhost:8080");

wss.on("connection", (ws, req) => {
	const filename = `data/replay_${Date.now()}.bin`;
	const fileStream = fs.createWriteStream(filename, { flags: "a" });
	console.log(`Connected ${filename}`);

	ws.on("message", function(message, isBinary) {
		fileStream.write(message, (err) => {
			if (err) return console.error("Error writing to file stream:", err);
		});
	});
	ws.on("close", function() {
		console.log(`Disconnected ${filename}`);
		fileStream.end(() => {
			console.log("File stream closed");
		});
	});
});