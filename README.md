# Multimodal AI Chatbot (Groq)

A simple ChatGPT-style **multimodal AI chatbot** that can understand both **text and images**.

You can type a question, upload an image, or do both together. The chatbot sends the input to a multimodal AI model through the **Groq API** and returns the response.

## ✨ Features

- 💬 Chat with AI using text
- 🖼️ Upload and analyze images
- 🔄 Supports text + image in the same message
- 🧠 Maintains conversation history during a session
- ⏳ Loading/typing indicator
- ❌ Error handling
- 🖼️ Image preview before sending
- 🔐 API key stored securely using environment variables
- 📱 Clean and responsive chat interface

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

### Backend
- Node.js
- Express
- TypeScript
- Multer

### AI
- Groq API
- Multimodal Qwen model

## 🏗️ Project Structure

```text
multimodal-ai-chatbot/
│
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── config.ts
│   │   ├── errors.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── api/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── tools/
├── .env.example
├── .gitignore
└── README.md
