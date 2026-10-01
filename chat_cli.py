#!/usr/bin/env python3
"""
Interactive CLI Terminal Chat for Mistral 7B
Connects directly to local Ollama on 127.0.0.1:11434
"""

import json
import sys
import urllib.error
import urllib.request

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_MODEL = "mistral:latest"


def stream_chat(messages, model=DEFAULT_MODEL):
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.7,
        },
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    full_response = ""
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                if line:
                    chunk = json.loads(line.decode("utf-8"))
                    content = chunk.get("message", {}).get("content", "")
                    sys.stdout.write(content)
                    sys.stdout.flush()
                    full_response += content
        print()
        return full_response
    except urllib.error.URLError as e:
        print(f"\n[!] Connection error: {e}. Is Ollama running on port 11434?")
        return None


def main():
    print("=" * 60)
    print(f"  Mistral 7B Local CLI")
    print(f"  Model: {DEFAULT_MODEL}")
    print("  Type 'exit' or 'quit' to quit, 'clear' to reset chat.")
    print("=" * 60)

    messages = [
        {"role": "system", "content": "You are Mistral, a helpful, precise, and fast assistant."}
    ]

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit"):
                print("Goodbye!")
                break
            if user_input.lower() == "clear":
                messages = [messages[0]]
                print("[Chat history cleared.]")
                continue

            messages.append({"role": "user", "content": user_input})
            print("\nMistral: ", end="")
            assistant_reply = stream_chat(messages)
            if assistant_reply:
                messages.append({"role": "assistant", "content": assistant_reply})
        except KeyboardInterrupt:
            print("\nExiting...")
            break


if __name__ == "__main__":
    main()
