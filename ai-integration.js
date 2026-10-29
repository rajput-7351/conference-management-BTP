const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api";


// --- LocalStorage Persistence ---
const RAG_STORAGE_KEY = 'aiRagChatState';
const AGENT_STORAGE_KEY = 'aiAgentChatState';

document.addEventListener('DOMContentLoaded', () => {
    const ragState = JSON.parse(localStorage.getItem(RAG_STORAGE_KEY) || '[]');
    ragState.forEach(msg => appendMessage(msg.role, msg.text, false));
    
    const agentState = JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY) || '[]');
    agentState.forEach(msg => logTerminal(msg.text, msg.type, msg.isMarkdown, false));
    
    if (agentState.length > 0 && document.getElementById('download-research-btn')) {
        document.getElementById('download-research-btn').style.display = 'block';
    }
});

// Generic Download Helper
function downloadTranscript(filename, content) {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

window.hasUnsavedAIData = function() {
    const rag = JSON.parse(localStorage.getItem(RAG_STORAGE_KEY) || '[]');
    const agent = JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY) || '[]');
    return rag.length > 0 || agent.length > 0;
};

window.downloadAllAIData = function() {
    const dlRagBtn = document.getElementById('download-rag-chat-btn');
    const dlAgentBtn = document.getElementById('download-research-btn');
    const rag = JSON.parse(localStorage.getItem(RAG_STORAGE_KEY) || '[]');
    const agent = JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY) || '[]');
    
    if (rag.length > 0 && dlRagBtn) dlRagBtn.click();
    if (agent.length > 0 && dlAgentBtn) dlAgentBtn.click();
};

window.clearAIData = function() {
    localStorage.removeItem(RAG_STORAGE_KEY);
    localStorage.removeItem(AGENT_STORAGE_KEY);
};

// --- RAG Chatbot Integration ---
const uploadBtn = document.getElementById('btn-upload-rag');
const fileInput = document.getElementById('file-rag-upload');
const sendBtn = document.getElementById('btn-send-rag');
const chatInput = document.getElementById('rag-chat-input');
const chatHistory = document.getElementById('rag-chat-history');

function appendMessage(role, text, save=true) {
    if (save) {
        const ragState = JSON.parse(localStorage.getItem(RAG_STORAGE_KEY) || '[]');
        ragState.push({ role, text });
        localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(ragState));
    }

    const msgEl = document.createElement('div');
    msgEl.className = role === 'user' ? 'message msg-user' : 'message msg-bot';
    
    if (role === 'bot' && typeof marked !== 'undefined') {
        try {
            msgEl.innerHTML = marked.parse(text);
        } catch(e) {
            msgEl.innerHTML = text;
        }
    } else {
        msgEl.innerHTML = text;
    }
    
    chatHistory.appendChild(msgEl);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

const dlRagBtn = document.getElementById('download-rag-chat-btn');
if (dlRagBtn) {
    dlRagBtn.addEventListener('click', () => {
        const state = JSON.parse(localStorage.getItem(RAG_STORAGE_KEY) || '[]');
        if(state.length === 0) return alert("No chat data to download.");
        let content = "# Document Chat Transcript\n\n";
        state.forEach(msg => {
            content += `**${msg.role === 'user' ? 'You' : 'AI'}**:\n${msg.text}\n\n`;
        });
        downloadTranscript('RAG_Chat_Transcript.md', content);
    });
}

if(uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert("Please select a PDF file first.");
            return;
        }

        uploadBtn.textContent = "Processing...";
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${BACKEND_URL}/rag/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                appendMessage('bot', `PDF indexed successfully! Extracted ${data.chunks} chunks. You can now ask questions.`);
            } else {
                appendMessage('bot', `Error: ${data.detail || 'Failed to process PDF'}`);
            }
        } catch (e) {
            appendMessage('bot', `Server error: Could not connect to AI Backend.`);
        } finally {
            uploadBtn.textContent = "Process PDF Database";
            uploadBtn.disabled = false;
        }
    });
}

if(sendBtn) {
    sendBtn.addEventListener('click', async () => {
        const query = chatInput.value.trim();
        if(!query) return;

        appendMessage('user', query);
        chatInput.value = '';

        try {
            // Placeholder thinking message
            const thinkingId = "think-" + Date.now();
            const msgEl = document.createElement('div');
            msgEl.className = 'message msg-bot';
            msgEl.id = thinkingId;
            msgEl.innerHTML = "<i>Thinking...</i>";
            chatHistory.appendChild(msgEl);

            const res = await fetch(`${BACKEND_URL}/rag/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, session_id: "demo1" })
            });

            document.getElementById(thinkingId).remove();

            if (res.ok) {
                const data = await res.json();
                appendMessage('bot', data.answer);
            } else {
                const errData = await res.json();
                appendMessage('bot', `Error: ${errData.detail}`);
            }
        } catch (e) {
             appendMessage('bot', `Server error during answer retrieval.`);
        }
    });
}

// Allow Enter key to send
if(chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendBtn.click();
    });
}

// --- Research Agent Integration ---
const runResearchBtn = document.getElementById('btn-run-research');
const researchPrompt = document.getElementById('ai-research-prompt');
const researchTerminal = document.getElementById('research-output-terminal');

function logTerminal(text, type='info', isMarkdown=false, save=true) {
    if (save) {
        const agentState = JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY) || '[]');
        agentState.push({ text, type, isMarkdown });
        localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agentState));
        
        const dlBtn = document.getElementById('download-research-btn');
        if (dlBtn) dlBtn.style.display = 'block';
    }

    const el = document.createElement('div');
    if (type === 'error') el.style.color = '#ef4444';
    else if (type === 'success') el.style.color = '#10b981';
    else if (type === 'tool') el.style.color = '#3b82f6';
    else el.style.color = '#e2e8f0'; // Default text color in terminal
    
    if (isMarkdown && typeof marked !== 'undefined') {
        // Output final markdown report beautifully
        const mdContainer = document.createElement('div');
        mdContainer.className = "markdown-output";
        mdContainer.style.background = "var(--surface-solid)";
        mdContainer.style.color = "var(--text-dark)";
        mdContainer.style.padding = "1.5rem";
        mdContainer.style.borderRadius = "8px";
        mdContainer.style.marginTop = "1rem";
        mdContainer.style.border = "1px solid rgba(255,255,255,0.1)"; // Fixed border color
        try {
            mdContainer.innerHTML = marked.parse(text);
            el.innerHTML = `> <b>FINAL REPORT:</b>`;
            el.appendChild(mdContainer);
        } catch(e) {
             el.innerHTML = `> <b>FINAL REPORT:</b><br/>${text.replace(/\\n/g, '<br/>')}`;
        }
    } else {
        el.innerHTML = `> ${text}`;
    }
    
    el.style.marginBottom = '12px';
    researchTerminal.appendChild(el);
    researchTerminal.scrollTop = researchTerminal.scrollHeight;
}

const dlAgentBtn = document.getElementById('download-research-btn');
if (dlAgentBtn) {
    dlAgentBtn.addEventListener('click', () => {
        const state = JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY) || '[]');
        if(state.length === 0) return alert("No research data to download.");
        let content = "# Autonomous Research Agent Report\n\n";
        state.forEach(msg => {
            if (msg.isMarkdown) {
                content += `${msg.text}\n\n`;
            } else {
                content += `> [${msg.type.toUpperCase()}] ${msg.text}\n\n`;
            }
        });
        downloadTranscript('Agent_Research_Report.md', content);
    });
}

if(runResearchBtn) {
    runResearchBtn.addEventListener('click', async () => {
        const query = researchPrompt.value.trim();
        if(!query) return;

        logTerminal(`Dispatching Research Agent: "${query}"`, 'info');
        runResearchBtn.disabled = true;
        runResearchBtn.textContent = 'Agent Running...';

        try {
            const res = await fetch(`${BACKEND_URL}/agent/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, session_id: "owner" })
            });
            const data = await res.json();
            
            if(res.ok) {
                logTerminal(`✓ Agent finished successfully.`, 'success');
                // Format steps
                if(data.steps) {
                    data.steps.forEach(step => {
                        if (step.type === 'tool_call') {
                            logTerminal(`Using tool <b>${step.tool}</b> with args: ${JSON.stringify(step.input)}`, 'tool');
                        }
                    });
                }
                logTerminal(data.final_answer, 'info', true);
            } else {
                logTerminal(`Agent Error: ${data.detail}`, 'error');
            }
        } catch(e) {
            logTerminal(`Failed to connect to Agent Server.`, 'error');
        } finally {
            runResearchBtn.disabled = false;
            runResearchBtn.textContent = 'Deploy AI Agent 🚀';
        }
    });
}
