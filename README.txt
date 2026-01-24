███╗░░██╗░█████╗░██████╗░██████╗░░█████╗░░██╗░░░░░░░██╗░░░░█████╗░███╗░░██╗███████╗
████╗░██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗░██║░░██╗░░██║░░░██╔══██╗████╗░██║██╔════╝
██╔██╗██║███████║██████╔╝██████╔╝██║░░██║░╚██╗████╗██╔╝░░░██║░░██║██╔██╗██║█████╗░░
██║╚████║██╔══██║██╔══██╗██╔══██╗██║░░██║░░████╔═████║░░░░██║░░██║██║╚████║██╔══╝░░
██║░╚███║██║░░██║██║░░██║██║░░██║╚█████╔╝░░╚██╔╝░╚██╔╝░██╗╚█████╔╝██║░╚███║███████╗
╚═╝░░╚══╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░░░░╚═╝░░░╚═╝░░╚═╝░╚════╝░╚═╝░░╚══╝╚══════╝
█▀█ █▀▀ █▀█ █░░ ▄▀█ █▄█   █▀▄▀█ █▀█ █▀▄
█▀▄ ██▄ █▀▀ █▄▄ █▀█ ░█░   █░▀░█ █▄█ █▄▀ v1.7 by Xeltalliv

Record everything that happens in Narrow One matches to view it later as a spectator.
Packaged on 24th of January 2026. https://github.com/Xeltalliv/n1-replay-mod

=== Theory behind how it works ===
Creating replays requires constantly recording and later restoring the states of the game.
Figuring out what to record, how to endode it and how to restore it is typically hard.
Thankfully, Narrow One is a multiplayer game, so it already has everything to do that.
The game already has to encode/send/restore all the relevant game state between players to ensure that everyone
sees the same things happening in the game world. So if you could somehow capture the network traffic and
play it back to the game later from a fake server, you'll see the same things happening in the game again.
This is exactly what this replay mod does.


=== Installation ===
1. If you are getting this from GitHub, click "Code" -> "Download ZIP".
2. Very important: Extract this zip archive. Make sure you do all the further steps on extractd files.
   Going inside this zip and trying to run files without extracting will not work!
   After extracting, zip file itself can be deleted.
3. Install NodeJS (https://nodejs.org/).
4. Install TamperMonkey (https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
5. If browser is Chromium-based, enable "Developer mode" for TamperMonkey to work (https://www.tampermonkey.net/faq.php?locale=en#Q209)
6. Create a new script in TamperMonkey and copy-paste the content of "recorderClient.js" in it. Press Ctrl+S to save.


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
So if you feel like origanizing it into directories, you can. Renaming files is also fine.


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
You can also watch this video: https://www.youtube.com/watch?v=OGkBYNBHdo4


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
2. Due to the nature of data that the mod deals with, it has to filter out some of it
   both during recording and during playback to keep you safe.
   However, while very rare, future versions of Narrow One might introduce new unsafe things
   that the mod wouldn't be prepared to deal with.
   Therefore it is adviced to keep this mod up to date.
   Using an outdated version to record replays might record sensitive information.
   Using an outdated version to view replays might cause harm to your account or local saves.


=== Copyright ===
MIT License

Copyright (c) 2024-2026 Xeltalliv

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This is an unofficial fan-made project not affiliated with, endorsed by,
or supported by Pelican Party Studios (developers of Narrow One).


=== A satisfying thing to try ===
1. Record a match.
2. Disable UI, disable showing weapon, enable smooth camera, enable spectator flight, unequip melee.
3. Launch your favourite playlist of fitting music.
4. Start viewing replay.
5. Fly around smoothly.
   Spam space bar and shift at different frequencies to smoothly adjust your vertical flight speed.
6. Enjoy flying in sync with music and getting epic panning views of the match.


=== Design considerations ===
1. Having to start recorderServer.mjs may seem inconvenient compared to doing recording
   entirely within the TamperMonkey script and downloading full replay file at the end.
   And yes, that could work... until you accidentally forget to save, close or reload tab, etc.
   That's why to make everyone to only use the safe approach, where it's difficult to accidentally
   mess up, the approach of recording entirely within the browser will intentionally not be provided.
   Treat the current thing as seatbelts in cars.
   It might seem "unneccessary" until something bad happens. Better be safe, than sorry.
   Another consideration is that while starting it is less convenient, usage is more convenient,
   since you don't have to constantly remind yourself that it exists and needs to be manually saved.
2. After viewing replay the client should not be modified in any way.
   If after viewing replay, without reloading tab user decides to join a normal match, there
   should be no extra chance of tripping anti-cheat compared to just playing the unmodified game.
3. NNC is not a replay format, it is a format of capturing raw network traffic in both directions.
   All the data processing to turn it into replays happens in playbackServer.mjs. For replays
   not all data is used. While it may seem wasteful, it gives a possibility for new versions of
   this mod to retroactively apply improvements to old replays, without running into the issue
   of needed data not being captured - everything that could've been captured has been captured.
   This also gives possibility for NNC files to be reused for things other than replays.
4. The content of node_modules is provided because people using this are not tech-savy, and
   requiring them to open terminal in the correct directory and run "npm install" is yet
   another step that may get them confused. At the same time, this project should be easy to
   tinker with by anyone, which is why there are no bundlers or build steps.


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
v1.6 Public release under MIT license
v1.7 Fixed gamemodes other than CTF not working
