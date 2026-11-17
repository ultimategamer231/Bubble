# Focus Bubble — How to test the Phase 2 build on your phone

**Who this is for:** you, the owner, testing on your own phone. No computer, coding or hosting needed.
**Phone this guide is written for:** Samsung Galaxy A24 (SM-A245F), Android 13, One UI 5.1.
**Build to test:** `phase-2` · file `FocusBubble-phase-2-debug.apk` · 121,474,638 bytes (about 116 MB).
**Time needed:** about 45 minutes in total, mostly waiting for timers. You can do it in several sittings.

---

## Part 1 — What you are testing (read this first)

Focus Bubble is a phone app. It runs entirely on your phone, so **there is nothing to host**: no website, no server, no account. The app was built automatically by GitHub and published as a file you download and install.

This build is **not the finished app**. It is a test build for the riskiest technical parts, checked on a real phone before the real screens are designed on top of them:

- a countdown in the notification shade that keeps ticking while the app is closed,
- **Pause** and **End** buttons on that notification that work even after you swipe the app away,
- an alert that arrives when a session ends, even with the screen off,
- the app behaving sensibly after you restart the phone.

You'll use a plain **test screen** with buttons. The real Focus, Jar and Insights screens come in Phase 4.

Your results decide how the rest of the app is built, so **an honest "fail" is just as useful as a "pass".**

---

## Part 2 — Before you start

- [ ] Phone charged above 30%.
- [ ] Connected to **Wi‑Fi** (the download is about 116 MB).
- [ ] Phone **not** on Mute or Do Not Disturb (you'll switch to Mute only for item 10).
- [ ] Something to write results down: the Samsung Notes app is fine.
- [ ] **Do not** change any battery settings before testing. I need to see how the phone behaves by default.

---

## Part 3 — Install the app

Do all of this **on the phone**.

1. Open **Chrome** or **Samsung Internet**.
2. Type this address and open it:
   **https://github.com/ultimategamer231/Bubble/releases/tag/phase-2**
   You don't need a GitHub account.
3. Scroll down to the section called **Assets**. Tap **FocusBubble-phase-2-debug.apk**.
   - If the browser warns *"This type of file can harm your device"*, tap **Download anyway**.
4. Wait for the download to finish, then tap **Open** on the message that appears.
   - Missed it? Open the **My Files** app → **Downloads** → tap the APK file.
5. **First time only:** the phone says *"For your security, your phone is not allowed to install unknown apps from this source."*
   - Tap **Settings** → turn on **Allow from this source** → press **Back**.
6. Tap **Install**.
   - If **Google Play Protect** shows *"Unsafe app blocked"* or *"Unknown app"*, tap **More details → Install anyway**. This happens because the app isn't on the Play Store yet.
7. Tap **Open**. Afterwards you'll find **Focus Bubble** (a teal bubble icon) in your app drawer.

> **Already installed an earlier test build** (`phase-0-fix1`)? Just install this one over it; no need to uninstall first.

---

## Part 4 — Find your way around the test screen

1. Open Focus Bubble. You'll see **"Focus Bubble"** in the middle of a pale aqua screen (very dark teal if your phone is in dark mode).
2. Below it, tap **Open native spike (debug build)**. This opens the **test screen**.

What's on the test screen, top to bottom:

| Section | What it shows / does |
|---|---|
| **Timer** | The current session, e.g. `Focus — RUNNING`, and the time left. |
| Buttons **Start · Pause · Resume · End · Skip** | Control the timer, like the real app will. |
| Buttons **Focus = 1 min / 5 min / 25 min** | Set how long the **next** focus session lasts. Use short ones for testing. |
| **Permissions** | Whether notifications and "precise alerts" are allowed, with buttons to change them. |
| **Clock** | Technical info about the phone's clock. You can ignore it. |
| **Wallpaper palette** | Coloured squares taken from your wallpaper. |
| **Recorded sessions** | Each finished or ended session. A `FOCUS COMPLETED` line = one bubble earned. |
| **Event log** | A diary of what happened, newest first, with times. **You'll copy lines from here.** |

**Tip:** tap **Clear log** before each checklist item so the lines you need are at the top.
**Tip:** to copy a log line exactly, take a screenshot (press **Power + Volume down** together) instead of typing it out.

---

## Part 5 — The checklist (12 items)

For each item, do the steps, then compare with **"Correct looks like"**. Write **pass** or **fail**, and when it fails, write what you saw instead.

---

### Item 1 — The app launches

**Do:**
1. Find **Focus Bubble** in the app drawer and look at its icon.
2. Open it.

**Correct looks like:**
- The icon is a **teal bubble on a pale aqua background**, not a green Android robot.
- A short splash with the bubble, then a screen with **"Focus Bubble"** in a **rounded** typeface (rounder than Samsung's normal font).
- No red or black error screen, no "App keeps stopping", no "Unable to load script".

---

### Item 2 — Allow notifications

**Do:**
1. Open the test screen.
2. Tap **Ask for notifications**.
3. When Android asks *"Allow Focus Bubble to send you notifications?"*, tap **Allow**.

**Correct looks like:**
- **Notifications allowed:** shows `true`.

*(If you denied it by mistake: tap **Notification settings**, turn notifications on, come back.)*

---

### Item 3 — The countdown notification ticks

**Do:**
1. Tap **Focus = 5 min**, then tap **Start**.
2. Press the **Home** button.
3. Swipe down from the top of the screen to open the notification shade.

**Correct looks like:**
- A notification titled **"Focus"** with a countdown such as `4:52` that **goes down every second** by itself.
- Two buttons on it: **Pause** and **End**. *(You may need to swipe down on the notification to expand it and see the buttons.)*

---

### Item 4 — Pause and Resume from the notification (app in the background)

**Do:**
1. With the shade still open from item 3, tap **Pause** on the notification.
2. Watch the notification.
3. Then tap **Resume** on it.

**Correct looks like:**
- Within about **3 seconds**, the notification changes to **"Paused · 4:xx left"**, the countdown stops, and the button becomes **Resume**.
- After **Resume**, the countdown ticks again from where it stopped.

---

### Item 5 — Pause when the app is fully closed ⭐ most important item

**Do:**
1. Make sure a session is running (if not: open the app, **Focus = 5 min**, **Start**).
2. Tap the **Recents** button (the three vertical lines, bottom left).
3. **Swipe Focus Bubble up** to close it completely.
4. Open the notification shade and tap **Pause** on the Focus notification.
5. **Count the seconds** until it changes to "Paused".
6. Open the app → test screen → look in the **Event log**.

**Correct looks like:**
- The notification changes to **"Paused"** within about **3 seconds**, same as item 4.
- The event log has a line like **`button/Pause applied in 1840 ms`**.

**Write down:** pass/fail, the seconds you counted, and the exact `applied in … ms` line.

---

### Item 6 — The alert arrives with the screen off (precise alerts ON)

On Android 13, "precise alerts" are usually already allowed.

**Do:**
1. On the test screen, check **Precise alerts (exact alarms):** shows `true`.
   - If it shows `false`: tap **Precise alerts settings**, switch it **on**, press **Back**.
2. Tap **End** (to clear any running session), then **Focus = 5 min**, then **Start**. Note the time.
3. Open **Recents** and swipe Focus Bubble away.
4. Press the **power button** to turn the screen off. Put the phone down and don't touch it.
5. Wait about **5 minutes**.

**Correct looks like:**
- At about the 5-minute mark, a notification **"Bubble earned"** arrives, saying **"5 min of focus"**, with a **soft two-note chime**. The screen may light up.
- Afterwards, open the app → test screen → the event log has a line like **`alarm fired, 312 ms after the deadline`**.

**Write down:** pass/fail and the exact `alarm fired, … after the deadline` line.

---

### Item 7 — Exactly one bubble was recorded

**Do:** right after item 6, look at the test screen.

**Correct looks like:**
- **Recorded sessions** has exactly **one new** line starting `FOCUS COMPLETED`, not two.
- **Timer** shows `Focus — COMPLETED`, not RUNNING.

---

### Item 8 — "Start break" button on the alert

**Do:**
1. On the test screen tap **End**, then **Focus = 1 min**, then **Start**.
2. Press **Home** and keep the screen on. Wait 1 minute.
3. When **"Bubble earned"** arrives, expand it and tap its **Start break** button.

**Correct looks like:**
- Within a few seconds, a new **"Short break"** notification appears with a countdown ticking down from about **5:00**.

---

### Item 9 — The alert with precise alerts OFF

Without precise alerts, Android is allowed to deliver the alert late to save battery. This item measures how late.

**Do:**
1. On the test screen tap **Precise alerts settings** and switch it **off**. Press **Back**; it should now show `false`.
   - If that button opens nothing: go to **Settings → Apps → ⋮ (top right) → Special access → Alarms & reminders → Focus Bubble → off**.
2. Tap **End**, then **Focus = 5 min**, then **Start**.
3. Swipe the app away in Recents, turn the screen off, and leave the phone for **10 minutes**.
4. Open the app → test screen → event log.

**Correct looks like:**
- "Bubble earned" arrives; it may be late, which is acceptable here.
- The log has a line like **`alarm fired, 95000 ms after the deadline`** (95000 ms = 95 seconds late).

**Write down:** pass/fail and the exact `alarm fired, …` line.
**Afterwards:** switch precise alerts back **on** (step 1 again, but on).

---

### Item 10 — Silent mode means no sound

**Do:**
1. Set the phone to **Mute** (pull down quick settings → tap the sound icon until it shows Mute).
2. On the test screen tap **End**, **Focus = 1 min**, **Start**. Wait 1 minute.

**Correct looks like:**
- The **"Bubble earned"** notification arrives with **no chime**.

**Afterwards:** set the phone back to **Sound**.

---

### Item 11 — Restart the phone in the middle of a session

**Do:**
1. On the test screen tap **End**, **Focus = 5 min**, **Start**.
2. Hold the **power button** (or Power + Volume down) → **Restart**.
3. After the phone starts, unlock it and **wait one minute**.
4. Open the notification shade.
5. Open the app → test screen.

**Correct looks like:**
- In the shade there is **no** Focus countdown showing a strange time (like `00:00` counting up, or hours).
- On the test screen: **Timer** shows `Focus — IDLE` and **notice pending: true**.
- **Recorded sessions** has a new line `FOCUS INTERRUPTED`.
- The event log shows **`boot completed`** and a line containing **`recorded INTERRUPTED`**.

*(Why: after a restart the phone's internal stopwatch starts from zero, so the app can't prove the session finished. It marks it interrupted instead of handing out a bubble it can't vouch for.)*

---

### Item 12 — Wallpaper colours are read

**Do:** look at **Wallpaper palette** on the test screen.

**Correct looks like:**
- A row of **coloured squares** that roughly match your wallpaper's colours. (If you change your wallpaper and reopen the test screen, they should change too.)

---

## Part 6 — If something goes wrong

| Problem | What to try |
|---|---|
| "App not installed" | Free up some storage and try again. If you have an older Focus Bubble installed and it still fails, uninstall it first. |
| Download is very slow or stops | Switch to Wi‑Fi and tap the file under **Assets** again. |
| Notification buttons aren't visible | Swipe **down** on the notification itself to expand it. |
| Items 5, 6 or 9 fail or are very late | **Don't change anything yet.** Just note it. Then check **Settings → Battery and device care → Battery → Background usage limits** and tell me if Focus Bubble is listed under **Sleeping apps** or **Deep sleeping apps**. |
| The app shows an error screen | Take a screenshot and send it. |
| You're unsure whether something counts as pass | Write what you saw; I'll judge it. |

---

## Part 7 — How to send your results

Copy this template into your reply and fill it in. Screenshots of the event log are welcome instead of typed log lines.

```
Phone: Galaxy A24 SM-A245F, Android 13, One UI 5.1

1  pass / fail:
2  pass / fail:
3  pass / fail:
4  pass / fail:
5  pass / fail:  seconds counted = __ , log line = "button/Pause applied in ____ ms"
6  pass / fail:  log line = "alarm fired, ____ ms after the deadline"
7  pass / fail:
8  pass / fail:
9  pass / fail:  log line = "alarm fired, ____ ms after the deadline"
10 pass / fail:
11 pass / fail:
12 pass / fail:

Is Focus Bubble listed under Sleeping apps / Deep sleeping apps? yes / no / didn't check
Anything else I noticed:
```

Partial results are fine. Send what you have and finish the rest later.

---

## Part 8 — What happens with your results

- **Item 5 is the deciding test.** If notification buttons work with the app closed, the timer logic stays in one place (simpler and safer). If not, I build a small backup copy of the timer rules in Android's native language. Either way the app works; this just decides how it's built.
- Any **fail** gets fixed on a separate branch and you receive a new test build (`phase-2-fix1`). You'll only re-test the items that failed.
- Then I build Phase 3 (saving your data) and Phase 4 (the real screens).

---

## Removing the test app

Long-press the **Focus Bubble** icon → **Uninstall**. Nothing is stored anywhere else.
