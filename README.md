# 🎓 LCAS Jr - EDUARENA

An interactive, real-time quiz platform built with **Next.js**, featuring **Duolingo-style training**, competitive **PvP battles**, and **AI-generated questions**. Powered by **Firebase** and **Gemini AI**.

---

## 🚀 Features

- 🎯 **Multi-Subject ELO Ranking**  
  Separate ELO for:
  - Math
  - Bahasa Indonesia
  - English

- 🧠 **AI-Powered Quiz Generation**  
  Contextual questions tailored by difficulty and subject via **Gemini AI**

- 🕹️ **PvP Ranked Battles**  
  Real-time matchmaking & ELO adjustment system

- 🟢 **Duolingo-style Training Mode**  
  15 questions per level, 3-life system, persistent progress

- 🔁 **Real-Time Game State**  
  Synced using **Firebase Firestore**

- 🧪 **Placement Test System**  
  Dynamic skill test to assign initial ELO ratings

---

## 🤖 AI Question Generation

The app integrates with **Google's Gemini AI** to generate high-quality, structured quiz questions.

### 🔧 Setup Gemini Integration

1. Get a free API key from  
   👉 [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Add to `.env.local`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here


### ⚙️ How It Works

- 🧠 **Primary**: Tries Gemini AI first  
- 🧰 **Fallback**: Uses static question bank if AI fails  
- 🔍 **Validation**: Ensures format & structure  
- 🎯 **Contextual**: Based on subject & difficulty  

---

### 🧪 Try AI Generation

Log in and visit:  
/debug-ai-quiz

Test various combinations of subject & difficulty.

---

### 📝 Supported Subjects

- **Math**: Arithmetic, algebra, geometry  
- **Bahasa Indonesia**: Grammar, vocabulary, reading  
- **English**: Grammar, vocabulary, comprehension  

---

## 🎮 Training Mode (3-Lives System)

- Players start with **3 lives** per level  
- Wrong answer ➝ -1 life  
- Level ends if:
  - 3 lives lost  
  - or 15 questions completed  
- Progress is saved across sessions  

---

## 🛠️ Development

```bash
npm install
npm run dev
```
### 🔐 Firebase Configuration

Update `.env.local` with your Firebase credentials:

```bash
# Firebase Admin SDK Config (real values for production)
FIREBASE_PROJECT_ID=eduarena-53c53
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@eduarena-53c53.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCVrQHUmjt5nDI7\naYbrOsIP9nUITEJQkF9hihJAnohm1zWnsFFtEHp8cNhJ3u40E4toIbochqvvZgEm\nMXNbxhN8DEZM4b3Vj5qTkLxns9FLd50s8LDRyUMvLIS8mKWoQQrZOU2Mr+1aeMRM\nQdA/Salvwt7IN2uprrIckmQqVnlszPnHqENIeAIsDjKZj3+BMMT6ejGZiAAEj84V\nL/JqJE9lF13ewU22LVmpszOKpRWLviHorvJFAYpdSMLOwTmjK9aav6jWdsFzCs6q\nx32/oLPj4o4ENejo1c0KZ5zE5YIRJtIpULw4xvzEUDioC+DSgLr6SFw0ptusWNpK\nHhAXkUppAgMBAAECggEALLAV3tMZtMpk2QY9yRem/zsXYB3cos8oGygtIOv0T7gr\nheCHvydvWp4ahZuwxQ2czr9bIM84oGZ1K2ESTzFJefz0NFol4pBYl3xcNB4k/AI/\nhD5snIYZsAj7rI9qzlx1D7wjIkEYfa2W9imkMnEczIiDGYYqd+P3u74dd+KPqGLp\nqC4CEAcaEsSDtcleEYntdKxcI/wszraRdLa/9YsgSZXk8hW5TqaB3quZv/zh5NNx\nilVUmRAqhOZ1KRV196AAY4LMs3r2HLJV0HNNNaEllRR0buHmHZTg64uDbZdJ4FDV\nc3ym3QZnMvtEQzgnkAOd5aK0F8Aqnl+1lgvQJPmjbQKBgQDL8CRn+AbTa5kl4VBL\njkwnxxtN4SJ3RbEjC6KAWItP8jv+5BxuARKRbNc2/0LY1mn/A4mC08QV8oXRdnIE\nTK9S1MYsCjqkKNrZWajfk9cPCGspsu+w5x++io2p6L88YfHGy4jnSu6uD6F63o+j\n49ar+kMiN1SJdIlN5ZVlhsnHLwKBgQC74rFKqlJo1H46Vkqju7vs21KiCbEbEfTk\n9APJsk+rHidP9bPwzWcTr8ATDZR6dw+gqtX7TBLZGtlrQr110vX6vug6WCNx2fC1\nB1DB4ErqtK/noTIOuQVLmxJqlVwXMRNK66rISCRe28ugQHV9atx7jGwJzEg6qTz9\nhtvs8+ah5wKBgBJg18cO0P6oiaqiPWwxrKdBCDLigQqimy3/VGugjx1rRQDZab54\nFkZIurRYGJwV5oN2vCOwFdGsg2a299tvVbVvO1Sor1Qv4lkH/XH4jr7qEU42s+cL\nTQ8MyWtwcBtu8CzsFrBRTmUdP34lJGiulZ/186rXtaSVffIpKGd32CM9AoGBALQU\n+LdG/svpd780fD/pLZs9MDuNLIp0sJRN6d+Fn+S0dxultb2FMlnlJyVb68dhnMHz\nXDuL07jxihjLlEp9VDTsjCt31SlHqfXpOBdLgqLpYnyRvSftYMzxqjosRGMaL5Ks\nxTlIJEwjQU2s2q/GH+PvWJIfkc9f7MxXWS4JLDJbAoGASvOMPv+UusUjXV909+sr\nOdROka5mxPnAd5p21ApgZJIBL0RBhNexIbsbZOpINJ7upfpWqbelTewHSWaBwNz8\nwjNnoSW6eyBGKo9q/8bzCtuvm4boFRwMP+jqg3PkMWvO4b3BsFtjkJUiZWMrM8xc\n3hBD49D3QWchjBRGiuv81tY=\n-----END PRIVATE KEY-----\n"

# Gemini AI API Configuration (FREE)
GEMINI_API_KEY=AIzaSyCskxJt1-gL8STAjbz6d5AAa-a1ki7CVIc
# Get your free Gemini API key from: https://makersuite.google.com/app/apikey
```

## 📌 Tech Stack

- **Frontend**: Next.js 14, TailwindCSS  
- **Backend**: Firebase Admin SDK  
- **Real-Time**: Firebase Firestore  
- **AI**: Gemini API by Google  
- **Auth**: Firebase Authentication  

---

## 💡 Inspiration

Combines the best of:  
- 🧩 **Duolingo’s gamified learning**  
- ♟️ **Chess.com’s ELO-based matchmaking**  
- 🤖 **AI-driven personalization**




