# History, Bible & Geography Quiz

A mobile-first quiz app where you answer multiple-choice questions on **world history**, **the Bible** and **geography**, in **English or Korean**.
It is a Progressive Web App (PWA): plain HTML/CSS/JS, no build step. You can add it to your phone's home screen and it works offline.

## Features
- Four modes: World History, The Bible, Geography, and Mixed
- Easy / Hard / All difficulty (163 questions, including 20 hard ones per topic)
- English and Korean (한국어), switchable from the home screen; Bible names follow the Korean Revised Version (개역개정)
- Rounds of 5, 10 or 20 questions, in a random order with shuffled answers
- Shows right or wrong straight away, with a short explanation (and the Bible reference for Bible questions)
- Optional 15-second timer per question
- Results screen with a score ring and a review of every answer
- Best score saved per mode and difficulty on the device
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
Edit `questions.js`. Each entry has English and Korean text, and the **first choice is the correct answer**
(choices are shuffled when shown):
```js
{ lvl: 1, // 1 = easy, 2 = hard
  en: ["Question?", ["Correct", "Wrong", "Wrong", "Wrong"], "Short explanation."],
  ko: ["질문?", ["정답", "오답", "오답", "오답"], "짧은 설명."] },
```
