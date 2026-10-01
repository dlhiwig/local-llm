#!/usr/bin/env python3
"""
Python Code Examples for Mistral 7B via Ollama
Includes single-turn prompts and multi-turn conversations
"""

import json
import urllib.request


def ask_mistral(prompt: str, model: str = "mistral:latest") -> str:
    """Send a single prompt and receive the complete response."""
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
        },
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("response", "")


def ask_chat(messages: list, model: str = "mistral:latest") -> str:
    """Send conversation messages and get assistant reply."""
    url = "http://127.0.0.1:11434/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("message", {}).get("content", "")


if __name__ == "__main__":
    prompt = "Explain in 2 sentences why local LLMs are great for privacy and latency."
    print(f"Prompt: {prompt}\n")
    response = ask_mistral(prompt)
    print(f"Mistral:\n{response}")
