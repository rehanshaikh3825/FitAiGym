/**
 * FitAI Chatbot Frontend Logic
 * Connects to the Django /api/chat/ backend.
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const container = document.getElementById('chatbot-container');
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('close-chatbot');
    const chatInput = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingIndicator = document.getElementById('chatbot-typing');

    if (!container || !toggleBtn || !chatInput || !sendBtn || !messagesContainer) {
        console.error('Chatbot UI elements not found. Check base.html.');
        return;
    }

    // Toggle Visibility
    const toggleChat = () => {
        container.classList.toggle('chatbot-closed');
        if (!container.classList.contains('chatbot-closed')) {
            chatInput.focus();
            const badge = toggleBtn.querySelector('.notification-badge');
            if (badge) badge.classList.add('d-none');
        }
    };

    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Append message to UI
    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'bot' ? 'bot-msg' : 'user-msg';
        
        // Basic Markdown support for bold text
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        msgDiv.innerHTML = formattedText;
        
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Main send function
    async function sendMessage(text) {
        if (!text || !text.trim()) return;

        // UI Updates
        appendMessage('user', text);
        chatInput.value = '';
        typingIndicator.classList.remove('d-none');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch('/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // CSRF is currently exempt on backend for debugging, so we skip header for simplicity
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            typingIndicator.classList.add('d-none');

            if (response.ok) {
                appendMessage('bot', data.response);
            } else {
                console.error('Server error:', data);
                appendMessage('bot', `I'm sorry, I encountered an error: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            typingIndicator.classList.add('d-none');
            appendMessage('bot', "I'm having trouble reaching the server. Please check your connection.");
        }
    }

    // Event Listeners
    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(chatInput.value);
        }
    });

    // Handle Quick Action Buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query') || btn.innerText;
            sendMessage(query);
            // Hide quick actions after use to keep chat clean
            const parent = btn.closest('.quick-actions');
            if (parent) parent.style.display = 'none';
        });
    });

    // Initial nudge
    setTimeout(() => {
        if (container.classList.contains('chatbot-closed')) {
            const badge = toggleBtn.querySelector('.notification-badge');
            if (badge) badge.classList.remove('d-none');
        }
    }, 4000);
});
