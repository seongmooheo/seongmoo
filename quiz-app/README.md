# History & Bible Quiz

A mobile-first quiz app where you answer multiple-choice questions on **world history** and **the Bible**.
It is a Progressive Web App (PWA): plain HTML/CSS/JS, no build step. You can add it to your phone's home screen and it works offline.

## Features
- Three modes: World History (38 questions), The Bible (41 questions), and Mixed
- Rounds of 5, 10 or 20 questions, in a random order with shuffled answers
- Shows right or wrong straight away, with a short explanation (and the Bible reference for Bible questions)
- Optional 15-second timer per question
- Results screen with a score ring and a review of every answer
- Best score saved per mode on the device
- Vibrates on answers where the phone supports it; follows the phone's light/dark setting

## Run it
```bash
cd quiz-app
python3 -m http.server 8000
```
Open `http://localhost:8000` (or `http://<your-computer-ip>:8000` from a phone on the same Wi-Fi).

## Put it on your phone
Host the `quiz-app/` folder on any static host with HTTPS (GitHub Pages, Netlify, Cloudflare Pages).
Then open the link on your phone and:
- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ menu → *Install app* / *Add to Home screen*

## Add questions
Edit `questions.js`. Each entry looks like this:
```js
{ q: "Question text?", choices: ["A", "B", "C", "D"], answer: "A", explain: "Short explanation." }
```
`answer` must exactly match one of the `choices`. After changing any file, bump `CACHE` in `sw.js`
so installed copies download the update.
