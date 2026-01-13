███╗░░██╗░█████╗░██████╗░██████╗░░█████╗░░██╗░░░░░░░██╗░░░░█████╗░███╗░░██╗███████╗
████╗░██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗░██║░░██╗░░██║░░░██╔══██╗████╗░██║██╔════╝
██╔██╗██║███████║██████╔╝██████╔╝██║░░██║░╚██╗████╗██╔╝░░░██║░░██║██╔██╗██║█████╗░░
██║╚████║██╔══██║██╔══██╗██╔══██╗██║░░██║░░████╔═████║░░░░██║░░██║██║╚████║██╔══╝░░
██║░╚███║██║░░██║██║░░██║██║░░██║╚█████╔╝░░╚██╔╝░╚██╔╝░██╗╚█████╔╝██║░╚███║███████╗
╚═╝░░╚══╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░░░░╚═╝░░░╚═╝░░╚═╝░╚════╝░╚═╝░░╚══╝╚══════╝
█▀█ █▀▀ █▀█ █   ▄▀█ █▄█   █▀▄▀█ █▀█ █▀▄ 
█▀▄ ██▄ █▀▀ █▄▄ █▀█  █    █ ▀ █ █▄█ █▄▀ v1.0.0 by Xeltalliv

Record everything that happens in Narrow One matches to view it later as a spectator.
Packaged on 2nd of July 2025, compatible with Narrow One v1750859997.

=== Installation ===
1. Unpack this archive.
2. Install NodeJS (https://nodejs.org/).
3. Install TamperMonkey (https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
4. Create a new script in TamperMonkey and copy-paste the content of "recorderClient.js" in it.


=== Recording ===
1. Launch "recorderServer.mjs" using NodeJS.
2. Enable the recorder client script in TamperMonkey.
3. Now you can forget it exists and play the game as you normally do.
Opening multiple tabs is fine. Reloading or closing tabs is fine. Closing browser is fine.

When you join a match, you should see recorder server saying "Connected"
and once you leave - "Disconnected" and "File stream closed".
The replay files will appear in the "data" directory.


=== Stopping recording ===
1. Disable TamperMonkey script.
2. Stop the recorder server (press Ctrl+C).
Keeping TamperMonkey script enabled, while the recorder server isn't active will
result in 1 connection error happening in the background, every time you join a match.


=== Viewing the replays ===
1. Launch "playbackSever.mjs" using NodeJS.
2. Go to URL in your browser: https://narrow.one/?ip=ws://localhost:8081/YOUR_REPLAY_FILE_HERE.bin
   Example: https://narrow.one/?ip=http://localhost:8081/replay_1745157304986.bin


=== Commands ===
1. Type "/skip <minutes>" in chat to fast forward by specified amount of minutes.
2. Type "/stop" in chat to freeze the replay.


=== Disclaimers ===
1. Replays depend on the version of the game they were recorded in and therefore
   degarde and expire over time!
2. For now, the mod sanitizes replays so that they can't be malicious.
   While unlikely, future versions of the game might introduce new unsafe things
   that the mod wouldn't be prepared for.


=== Copyright ===
Use, modify, but do not distribute to anyone.
Especially don't post it to github, greasyfork, pastebin, etc.


=== A satisfyling thing to try ===
1. Record a match
2. Disable UI, disable showing weapon, enable smooth camera, enable spectator flight, unequip melee
3. Launch your favourite playlist of fitting music
4. Start viewing replay
5. Fly around smoothly
Spam space bar and shift at different frequencies to smoothly adjust your vertical flight speed
