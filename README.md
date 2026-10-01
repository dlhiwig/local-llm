# Local LLM Studio • Mistral 7B

A high-performance, private, and offline LLM workspace running directly on your laptop using Ollama and Mistral 7B.

## 🚀 Quick Start

### 1. Launch the Web Chat Interface
You can start the web interface in one of two ways:
- **Double click**: `start.bat`
- **Or run via terminal**:
  ```powershell
  cd c:\Users\Danie\Projects\local-llm
  python server.py
  ```
The server will automatically verify Ollama is active on port `11434`, launch the local proxy server, and open your browser to `http://localhost:5050`.

### 2. Interactive Terminal CLI
If you prefer chatting directly in PowerShell / Command Prompt:
```powershell
python chat_cli.py
```

### 3. Programmatic Python API
To integrate Mistral into your own Python scripts:
```powershell
python api_example.py
```

---

## ✨ Features

- **Real-Time Streaming**: Live token-by-token streaming responses with generation speed indicators (`tokens/sec`).
- **Installed Models**: Automatically detects and switches between all local models:
  - `mistral:latest` (7.2B, 4-bit quantized)
  - `llama3.2:1b` (1.2B)
  - `primary-ai:latest` (Gemma4 11.9B)
- **Local Persistence**: Conversations are saved in browser `localStorage`, allowing you to resume or delete chats anytime.
- **Model Parameter Controls**: Customize Temperature (creativity vs. precision), Top-P, and System Prompts in real-time.
- **Markdown & Code Highlighting**: Formatted text with syntax blocks and 1-click **Copy Code** buttons.
- **Exporting**: Export any conversation directly to clean Markdown (`.md`) files.
- **100% Offline & Private**: Zero external telemetry or cloud dependencies. All inference runs locally on your laptop hardware.

---

## 📁 Project Structure

```
c:\Users\Danie\Projects\local-llm\
├── public\
│   ├── index.html       # Web chat interface structure
│   ├── style.css        # Responsive dark UI & design system
│   └── app.js           # Streaming NDJSON chat client & persistence
├── server.py            # Zero-dependency Python HTTP server & Ollama proxy
├── chat_cli.py          # Interactive terminal chat client
├── api_example.py       # Python script integration sample
├── start.bat            # Windows 1-click launcher
└── README.md            # Documentation
```
