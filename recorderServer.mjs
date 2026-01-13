#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import url from "node:url";
import path from "node:path";
import { WebSocketServer } from "ws";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wss = new WebSocketServer({ port: 8080 });

wss.on("listening", () => {
	console.log("listening on ws://localhost:8080");
});
wss.on("error", (err) => {
	if (err.code === "EADDRINUSE") {
		console.error("Error: port 8080 is already in use by something else.");
		console.error("another copy of recorder server may already be running.");
	} else {
		console.error(err);
	}
	process.exit(1);
});
wss.on("connection", (ws, req) => {
	const filename = path.join(__dirname, "data", `replay_${Date.now()}.nnc`);
	const fileStream = fs.createWriteStream(filename, { flags: "a" });
	console.log(`Connected ${filename}`);

	ws.on("message", function(message, isBinary) {
		fileStream.write(message, (err) => {
			if (err) return console.error("Error writing to file stream:", err);
		});
	});
	ws.on("close", function() {
		console.log(`Disconnected ${filename}`);
		//fileStream.end(() => {
		//	console.log("File stream closed");
		//});
	});
});
