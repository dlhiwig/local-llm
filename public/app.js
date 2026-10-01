/**
 * Local LLM Studio - Frontend Application
 * Real-time streaming chat client for Mistral 7B & Ollama
 */

// State
let conversations = [];
let currentConvId = null;
let isGenerating = false;
let abortController = null;
let availableModels = [];

// DOM Elements
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearAllHistoryBtn = document.getElementById("clearAllHistoryBtn");
const historyList = document.getElementById("historyList");

const tempSlider = document.getElementById("tempSlider");
const tempVal = document.getElementById("tempVal");
const topPSlider = document.getElementById("topPSlider");
const topPVal = document.getElementById("topPVal");
const systemPromptInput = document.getElementById("systemPrompt");
const resetParamsBtn = document.getElementById("resetParamsBtn");

const serverStatusDot = document.getElementById("serverStatusDot");
const serverStatusText = document.getElementById("serverStatusText");
const modelSelect = document.getElementById("modelSelect");
const modelFamilyBadge = document.getElementById("modelFamilyBadge");

const exportChatBtn = document.getElementById("exportChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");

const messagesContainer = document.getElementById("messagesContainer");
const emptyState = document.getElementById("emptyState");
const messagesList = document.getElementById("messagesList");

const chatForm = document.getElementById("chatForm");
const promptInput = document.getElementById("promptInput");
const sendBtn = document.getElementById("sendBtn");
const stopBar = document.getElementById("stopBar");
const stopGenBtn = document.getElementById("stopGenBtn");
const tokenSpeedBadge = document.getElementById("tokenSpeedBadge");

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadSavedSettings();
  loadConversations();
  fetchModels();
  setupEventListeners();

  if (!currentConvId || !getConversation(currentConvId)) {
    startNewConversation();
  } else {
    renderCurrentConversation();
  }
});

// Event Listeners
function setupEventListeners() {
  // Sidebar Toggle
  toggleSidebarBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  // Sliders
  tempSlider.addEventListener("input", (e) => {
    tempVal.textContent = e.target.value;
    saveSettings();
  });

  topPSlider.addEventListener("input", (e) => {
    topPVal.textContent = e.target.value;
    saveSettings();
  });

  systemPromptInput.addEventListener("input", () => {
    saveSettings();
  });

  resetParamsBtn.addEventListener("click", () => {
    tempSlider.value = "0.7";
    tempVal.textContent = "0.7";
    topPSlider.value = "0.9";
    topPVal.textContent = "0.9";
    systemPromptInput.value = "";
    saveSettings();
  });

  // Chat Actions
  newChatBtn.addEventListener("click", () => {
    if (isGenerating) stopGeneration();
    startNewConversation();
  });

  clearChatBtn.addEventListener("click", () => {
    if (isGenerating) stopGeneration();
    const conv = getConversation(currentConvId);
    if (conv) {
      conv.messages = [];
      saveConversations();
      renderCurrentConversation();
    }
  });

  clearAllHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all conversation history?")) {
      if (isGenerating) stopGeneration();
      conversations = [];
      saveConversations();
      startNewConversation();
    }
  });

  exportChatBtn.addEventListener("click", exportConversationAsMarkdown);

  // Form & Inputs
  promptInput.addEventListener("input", () => {
    autoResizeTextarea();
    sendBtn.disabled = !promptInput.value.trim() || isGenerating;
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        chatForm.requestSubmit();
      }
    }
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = promptInput.value.trim();
    if (!text || isGenerating) return;
    sendMessage(text);
  });

  stopGenBtn.addEventListener("click", stopGeneration);

  // Quick Starter Cards
  document.querySelectorAll(".starter-card").forEach((card) => {
    card.addEventListener("click", () => {
      const prompt = card.getAttribute("data-prompt");
      if (prompt) {
        promptInput.value = prompt;
        autoResizeTextarea();
        sendBtn.disabled = false;
        sendMessage(prompt);
      }
    });
  });

  modelSelect.addEventListener("change", (e) => {
    updateModelBadge(e.target.value);
    saveSettings();
  });
}

// Fetch Installed Models from Ollama
async function fetchModels() {
  try {
    const res = await fetch("/api/tags");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    availableModels = data.models || [];

    if (availableModels.length > 0) {
      modelSelect.innerHTML = "";
      let foundMistral = false;
      const savedModel = localStorage.getItem("local_llm_model");

      availableModels.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.name;
        const sizeGB = (m.size / (1024 * 1024 * 1024)).toFixed(1);
        opt.textContent = `${m.name} (${sizeGB} GB)`;
        modelSelect.appendChild(opt);

        if (m.name.includes("mistral")) {
          foundMistral = m.name;
        }
      });

      // Default to saved model or mistral if available
      if (savedModel && availableModels.some((m) => m.name === savedModel)) {
        modelSelect.value = savedModel;
      } else if (foundMistral) {
        modelSelect.value = foundMistral;
      }

      updateModelBadge(modelSelect.value);
      setServerStatus(true, `Ollama Online (${availableModels.length} models)`);
    } else {
      setServerStatus(false, "No models found in Ollama");
    }
  } catch (err) {
    console.error("Failed to fetch models:", err);
    setServerStatus(false, "Ollama Offline / Connecting...");
  }
}

function updateModelBadge(modelName) {
  if (modelName.includes("mistral")) {
    modelFamilyBadge.textContent = "Mistral 7B";
    modelFamilyBadge.style.color = "#ff7000";
    modelFamilyBadge.style.borderColor = "rgba(255, 112, 0, 0.3)";
  } else if (modelName.includes("llama")) {
    modelFamilyBadge.textContent = "Llama 3";
    modelFamilyBadge.style.color = "#00d2ff";
    modelFamilyBadge.style.borderColor = "rgba(0, 210, 255, 0.3)";
  } else if (modelName.includes("primary-ai") || modelName.includes("gemma")) {
    modelFamilyBadge.textContent = "Primary AI (Gemma)";
    modelFamilyBadge.style.color = "#9b51e0";
    modelFamilyBadge.style.borderColor = "rgba(155, 81, 224, 0.3)";
  } else {
    modelFamilyBadge.textContent = modelName.split(":")[0];
    modelFamilyBadge.style.color = "#ff7000";
  }
}

function setServerStatus(online, text) {
  if (online) {
    serverStatusDot.className = "status-dot";
    serverStatusText.textContent = text;
  } else {
    serverStatusDot.className = "status-dot offline";
    serverStatusText.textContent = text;
  }
}

// Conversation Management
function startNewConversation() {
  const newConv = {
    id: "conv_" + Date.now(),
    title: "New Conversation",
    createdAt: new Date().toISOString(),
    messages: [],
  };
  conversations.unshift(newConv);
  currentConvId = newConv.id;
  saveConversations();
  renderHistoryList();
  renderCurrentConversation();
  promptInput.focus();
}

function getConversation(id) {
  return conversations.find((c) => c.id === id);
}

function saveConversations() {
  try {
    localStorage.setItem("local_llm_conversations", JSON.stringify(conversations));
  } catch (e) {
    console.error("Could not save to localStorage:", e);
  }
}

function loadConversations() {
  try {
    const raw = localStorage.getItem("local_llm_conversations");
    if (raw) {
      conversations = JSON.parse(raw);
      if (conversations.length > 0) {
        currentConvId = conversations[0].id;
      }
    }
  } catch (e) {
    console.error("Error reading saved conversations:", e);
    conversations = [];
  }
  renderHistoryList();
}

function renderHistoryList() {
  historyList.innerHTML = "";
  if (conversations.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.style.padding = "0.75rem";
    emptyMsg.style.color = "var(--text-dim)";
    emptyMsg.style.fontSize = "0.8rem";
    emptyMsg.textContent = "No saved chats yet.";
    historyList.appendChild(emptyMsg);
    return;
  }

  conversations.forEach((conv) => {
    const item = document.createElement("div");
    item.className = `history-item ${conv.id === currentConvId ? "active" : ""}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "history-title";
    titleSpan.textContent = conv.title || "Untitled Chat";

    const delBtn = document.createElement("button");
    delBtn.className = "history-delete-btn";
    delBtn.title = "Delete chat";
    delBtn.innerHTML = `&times;`;

    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.addEventListener("click", () => {
      if (conv.id !== currentConvId) {
        if (isGenerating) stopGeneration();
        currentConvId = conv.id;
        renderHistoryList();
        renderCurrentConversation();
      }
    });

    item.appendChild(titleSpan);
    item.appendChild(delBtn);
    historyList.appendChild(item);
  });
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  if (currentConvId === id) {
    currentConvId = conversations.length > 0 ? conversations[0].id : null;
  }
  saveConversations();
  if (!currentConvId) {
    startNewConversation();
  } else {
    renderHistoryList();
    renderCurrentConversation();
  }
}

function renderCurrentConversation() {
  const conv = getConversation(currentConvId);
  messagesList.innerHTML = "";

  if (!conv || conv.messages.length === 0) {
    emptyState.style.display = "flex";
    messagesList.style.display = "none";
  } else {
    emptyState.style.display = "none";
    messagesList.style.display = "flex";

    conv.messages.forEach((msg) => {
      appendMessageToDOM(msg.role, msg.content, msg.stats);
    });
    scrollToBottom();
  }
}

// Message Rendering
function appendMessageToDOM(role, content, stats = null) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  if (role === "user") {
    avatar.textContent = "You";
  } else {
    avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#ff7000"/><path d="M2 17L12 22L22 17" fill="#ff3366"/><path d="M2 12L12 17L22 12" fill="#ff8c33"/></svg>`;
  }

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = formatMarkdown(content);

  if (stats && role === "assistant") {
    const statsEl = document.createElement("div");
    statsEl.className = "message-stats";
    statsEl.textContent = `${stats.speed || "0"} tokens/sec • ${stats.totalTokens || 0} tokens • ${stats.duration || "0"}s`;
    bubble.appendChild(statsEl);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesList.appendChild(row);
  return { row, bubble };
}

// Markdown & Code Block Formatter
function formatMarkdown(text) {
  if (!text) return "";

  // Escape basic HTML
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```lang ... ```
  escaped = escaped.replace(/```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || "text";
    const encodedCode = code.trim();
    return `
      <div class="code-block-container">
        <div class="code-block-header">
          <span>${language}</span>
          <button class="copy-code-btn" onclick="copyCode(this)">Copy</button>
        </div>
        <pre><code>${encodedCode}</code></pre>
      </div>
    `;
  });

  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  escaped = escaped.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  escaped = escaped.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  escaped = escaped.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold & Italic
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Bullet lists
  escaped = escaped.replace(/^\s*[\-\*]\s+(.*)$/gim, "<li>$1</li>");
  escaped = escaped.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");

  // Paragraphs
  const paragraphs = escaped.split(/\n{2,}/);
  escaped = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<div") || trimmed.startsWith("<h") || trimmed.startsWith("<ul")) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  return escaped;
}

// Global copy helper for code blocks
window.copyCode = function (btn) {
  const pre = btn.closest(".code-block-container").querySelector("pre code");
  if (!pre) return;
  navigator.clipboard.writeText(pre.innerText).then(() => {
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
};

// Send and Stream Message
async function sendMessage(userText) {
  const conv = getConversation(currentConvId);
  if (!conv) return;

  // Add user message
  conv.messages.push({ role: "user", content: userText });
  if (conv.messages.length === 1) {
    // Generate clean conversation title from first prompt
    conv.title = userText.slice(0, 36) + (userText.length > 36 ? "..." : "");
    renderHistoryList();
  }
  saveConversations();

  emptyState.style.display = "none";
  messagesList.style.display = "flex";
  appendMessageToDOM("user", userText);

  // Clear input
  promptInput.value = "";
  autoResizeTextarea();
  sendBtn.disabled = true;

  // Prepare UI for Assistant streaming
  isGenerating = true;
  stopBar.style.display = "flex";
  tokenSpeedBadge.style.display = "inline-block";
  tokenSpeedBadge.textContent = "Starting...";

  const { bubble } = appendMessageToDOM("assistant", "");
  const cursorSpan = document.createElement("span");
  cursorSpan.className = "cursor-blink";
  bubble.appendChild(cursorSpan);

  scrollToBottom();

  abortController = new AbortController();

  const selectedModel = modelSelect.value || "mistral:latest";
  const temperature = parseFloat(tempSlider.value) || 0.7;
  const top_p = parseFloat(topPSlider.value) || 0.9;
  const systemPrompt = systemPromptInput.value.trim();

  // Build message payload
  const apiMessages = [];
  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }

  // Include past messages in context
  conv.messages.forEach((m) => {
    apiMessages.push({ role: m.role, content: m.content });
  });

  const payload = {
    model: selectedModel,
    messages: apiMessages,
    stream: true,
    options: {
      temperature: temperature,
      top_p: top_p,
    },
  };

  let assistantText = "";
  let stats = null;
  const startTime = Date.now();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          if (chunk.message && chunk.message.content) {
            assistantText += chunk.message.content;
            bubble.innerHTML = formatMarkdown(assistantText);
            bubble.appendChild(cursorSpan);
            scrollToBottom();
          }

          if (chunk.done) {
            const evalCount = chunk.eval_count || 0;
            const evalDuration = chunk.eval_duration || 0;
            let speed = 0;
            if (evalDuration > 0 && evalCount > 0) {
              speed = (evalCount / (evalDuration / 1e9)).toFixed(1);
            }
            const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

            stats = {
              speed: speed,
              totalTokens: evalCount,
              duration: durationSec,
            };

            tokenSpeedBadge.textContent = `${speed} t/s`;
          }
        } catch (jsonErr) {
          console.warn("Could not parse NDJSON line:", line, jsonErr);
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      assistantText += "\n\n*(Generation stopped by user)*";
    } else {
      assistantText += `\n\n*(Error: ${err.message})*`;
      console.error("Streaming error:", err);
    }
  } finally {
    // Cleanup cursor
    if (cursorSpan.parentNode) {
      cursorSpan.remove();
    }

    bubble.innerHTML = formatMarkdown(assistantText);

    if (stats) {
      const statsEl = document.createElement("div");
      statsEl.className = "message-stats";
      statsEl.textContent = `${stats.speed || "0"} tokens/sec • ${stats.totalTokens || 0} tokens • ${stats.duration || "0"}s`;
      bubble.appendChild(statsEl);
    }

    // Save assistant message to conversation
    conv.messages.push({
      role: "assistant",
      content: assistantText,
      stats: stats,
    });
    saveConversations();

    isGenerating = false;
    abortController = null;
    stopBar.style.display = "none";
    sendBtn.disabled = !promptInput.value.trim();
    promptInput.focus();
  }
}

function stopGeneration() {
  if (abortController) {
    abortController.abort();
  }
  isGenerating = false;
  stopBar.style.display = "none";
  sendBtn.disabled = !promptInput.value.trim();
}

// Export Chat as Markdown
function exportConversationAsMarkdown() {
  const conv = getConversation(currentConvId);
  if (!conv || conv.messages.length === 0) {
    alert("No messages to export in current conversation.");
    return;
  }

  let md = `# ${conv.title || "Chat Export"}\n`;
  md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  conv.messages.forEach((m) => {
    if (m.role === "user") {
      md += `### User\n${m.content}\n\n`;
    } else {
      md += `### Mistral 7B\n${m.content}\n\n`;
      if (m.stats) {
        md += `*Stats: ${m.stats.speed} t/s | ${m.stats.totalTokens} tokens | ${m.stats.duration}s*\n\n`;
      }
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(conv.title || "mistral-chat").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helpers
function autoResizeTextarea() {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 180) + "px";
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function saveSettings() {
  localStorage.setItem("local_llm_temp", tempSlider.value);
  localStorage.setItem("local_llm_top_p", topPSlider.value);
  localStorage.setItem("local_llm_system_prompt", systemPromptInput.value);
  localStorage.setItem("local_llm_model", modelSelect.value);
}

function loadSavedSettings() {
  const t = localStorage.getItem("local_llm_temp");
  if (t) {
    tempSlider.value = t;
    tempVal.textContent = t;
  }
  const p = localStorage.getItem("local_llm_top_p");
  if (p) {
    topPSlider.value = p;
    topPVal.textContent = p;
  }
  const sys = localStorage.getItem("local_llm_system_prompt");
  if (sys) {
    systemPromptInput.value = sys;
  }
}
