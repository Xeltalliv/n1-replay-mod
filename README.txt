███╗░░██╗░█████╗░██████╗░██████╗░░█████╗░░██╗░░░░░░░██╗░░░░█████╗░███╗░░██╗███████╗
████╗░██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗░██║░░██╗░░██║░░░██╔══██╗████╗░██║██╔════╝
██╔██╗██║███████║██████╔╝██████╔╝██║░░██║░╚██╗████╗██╔╝░░░██║░░██║██╔██╗██║█████╗░░
██║╚████║██╔══██║██╔══██╗██╔══██╗██║░░██║░░████╔═████║░░░░██║░░██║██║╚████║██╔══╝░░
██║░╚███║██║░░██║██║░░██║██║░░██║╚█████╔╝░░╚██╔╝░╚██╔╝░██╗╚█████╔╝██║░╚███║███████╗
╚═╝░░╚══╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░░░░╚═╝░░░╚═╝░░╚═╝░╚════╝░╚═╝░░╚══╝╚══════╝
█▀█ █▀▀ █▀█ █░░ ▄▀█ █▄█   █▀▄▀█ █▀█ █▀▄
█▀▄ ██▄ █▀▀ █▄▄ █▀█ ░█░   █░▀░█ █▄█ █▄▀ v1.5 by Xeltalliv

Record everything that happens in Narrow One matches to view it later as a spectator.
Packaged on 22nd of November 2025.

=== Theory behind how it works ===
Creating replays requires constantly recording and later restoring the states of the game.
Figuring out what to record, how to endode it and how to restore it is typically hard.
Thankfully, Narrow One is a multiplayer game, so it already has everything to do that.
The game already has to encode/send/restore all the relevant game state between players to ensure that everyone
sees the same things happening in the game world. So if you could somehow capture the network traffic and
play it back to the game later from a fake server, you'll see the same things happening in the game again.
This is exactly what this replay mod does.


=== Installation ===
1. Very important: Extract this zip archive. Make sure you do all the further steps on extractd files.
   Going inside this zip and trying to run files without extracting will not work!
   After extracting, zip file itself can be deleted.
2. Install NodeJS (https://nodejs.org/).
3. Install TamperMonkey (https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
4. If browser is Chromium-based, enable "Developer mode" for TamperMonkey to work (https://www.tampermonkey.net/faq.php?locale=en#Q209)
5. Create a new script in TamperMonkey and copy-paste the content of "recorderClient.js" in it. Press Ctrl+S to save.


=== Starting recording ===
1. Launch "recorderServer.mjs" using NodeJS.
2. Enable the recorder client script in TamperMonkey.
   Ensure that you see red number next to TamperMonkey icon. If not, try reloading the page.
3. Now you can forget it exists and play the game as you normally do.
   When you join a match, you should see recorder server saying "Connected"
   and once you leave - "Disconnected".
   The replay files will appear in the "data" directory.

Opening multiple tabs is fine. Reloading or closing tabs is fine. Closing browser is fine.
Turning off or rebooting computer without stopping anything is also usually fine.
"nnc" file extension stands for "Narrow.one Network Capture".
All the files don't have to be directly in "data". Sub-directories within "data" are also supported.
So if you feel like origanizing it into directories, you can.


=== Stopping recording ===
1. Disable TamperMonkey script.
2. Stop the recorder server (close the window or press Ctrl+C).
   If you plan to record more later, you can only disable the script, but keep the server running.


=== Viewing the replays ===
1. Launch "playbackServer.mjs" using NodeJS.
2. Go to URL in your browser: https://narrow.one/?ip=ws://localhost:8081/YOUR_REPLAY_FILE_HERE.nnc
   Example: https://narrow.one/?ip=ws://localhost:8081/replay_1745157304986.nnc
   This tells the game to connect to custom server running on your computer, instead of real game servers.
3. Repeat step 2 as many times as you need. You can refresh the page to view replay again.
   If you refresh the page and it shows you squad menu, remove squad code from the url.
4. Once you are done, stop the playback server (close the window or press Ctrl+C).


=== Usage summary ===
To record replays you need to have recorder server running and tampermonkey script enabled.
To view replays you need to have playback server running and open specific url in the browser.


=== Commands ===
1. Type "/skip <minutes>" in chat to fast forward by specified amount of minutes.
2. Type "/skipto <minutes>" in chat to fast forward to specified amount of minutes.
3. Type "/stop" in chat to freeze the replay.
4. Type "/resume" in chat to resume playback of replay.
5. Type "/getskin" in chat while looking at player to add their skin to your presets.

If it is a non-squaded match and you want to run commands, press Esc
and press the "Squad" button on the left.


=== Disclaimers ===
1. Replays depend on the version of the game they were recorded in and therefore
   degarde and expire over time!
2. For now, the mod sanitizes replays, so that they can't do any harm.
   While unlikely, future versions of the game might introduce new unsafe things
   that the mod wouldn't be prepared for.

This mostly applies to if the mod is still somehow functional many months or years later.
It doesn't break often.


=== Copyright ===
You can use, modify, but please do not distribute.
Especially don't post it to github, greasyfork, pastebin, etc. where it's easily searchable.


=== A satisfying thing to try ===
1. Record a match.
2. Disable UI, disable showing weapon, enable smooth camera, enable spectator flight, unequip melee.
3. Launch your favourite playlist of fitting music.
4. Start viewing replay.
5. Fly around smoothly.
Spam space bar and shift at different frequencies to smoothly adjust your vertical flight speed.


=== Changelog ===
v1.0 Release
v1.1 Added ability to start squad in matches that weren't squaded (to be able to run commands)
v1.2 Both servers no longer depend on current working directory
v1.3 Fixed spectator spawn point
     Added human-readable error message for file being not found
     Added human-readable error message for port being already taken
     Changed file extension from .bin to .nnc
     Removed "File stream closed" when recording
     Added "/skipto <minutes>" command
v1.4 Fixed held item being stuck with wrong weather
     Made "/stop" command instant
     Added "/resume" command
     Added "/getskin" command
v1.5 Replay recorder client no longer records guest account data
