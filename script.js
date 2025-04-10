document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const langToggle = document.getElementById('langToggle');
    
    // API Configuration
    const GEMINI_API_KEY = 'AIzaSyByU0KAsZzwlNHXffGIdAkSSr02XAs5LJI'; // Replace with your actual API key
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    // State variables
    let isListening = false;
    let currentLanguage = 'english';
    let recognition = null;
    let conversationHistory = [
        {
            role: "user",
            parts: [{ text: "You are Dr. MediAI, an AI-powered virtual doctor. Provide concise medical advice, diagnosis predictions based on symptoms, recommended treatments with dosages, and preventive measures. Format responses with clear sections using these emojis: 🧬 for diagnosis, 💊 for treatment, 🛡 for prevention. Keep responses under 200 words." }]
        },
        {
            role: "model",
            parts: [{ text: "Understood! I'm Dr. MediAI, ready to provide medical guidance. I'll organize responses with:\n\n🧬 Possible diagnosis based on symptoms\n💊 Recommended treatment (medication + dosage)\n🛡 Preventive measures\n\nHow can I help you today? Please describe your symptoms." }]
        }
    ];
    
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = function() {
            isListening = true;
            voiceInputBtn.classList.add('listening');
        };
        
        recognition.onend = function() {
            isListening = false;
            voiceInputBtn.classList.remove('listening');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            isListening = false;
            voiceInputBtn.classList.remove('listening');
            addMessage("Sorry, I couldn't understand your voice input. Please try typing instead.", 'ai');
        };
    } else {
        voiceInputBtn.style.display = 'none';
    }
    
    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
    langToggle.addEventListener('click', toggleLanguage);
    
    // Functions
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // Add user message to chat and conversation history
        addMessage(message, 'user');
        conversationHistory.push({
            role: "user",
            parts: [{ text: message }]
        });
        
        // Clear input
        chatInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Get AI response from Gemini API
            const aiResponse = await getAIResponse(message);
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add AI response to chat and conversation history
            addMessage(aiResponse, 'ai');
            conversationHistory.push({
                role: "model",
                parts: [{ text: aiResponse }]
            });
        } catch (error) {
            console.error('Error getting AI response:', error);
            removeTypingIndicator();
            addMessage("Sorry, I'm having trouble responding right now. Please try again later.", 'ai');
        }
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    async function getAIResponse(userMessage) {
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: conversationHistory
                })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extract the generated text from the response
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Unexpected API response format');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            
            // Fallback to simulated responses if API fails
            return generateFallbackResponse(userMessage);
        }
    }
    
    function generateFallbackResponse(userMessage) {
        // This is a fallback when the API fails - similar to our previous simulated responses
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('headache') || lowerMessage.includes('سر درد')) {
            if (lowerMessage.includes('fever') || lowerMessage.includes('بخار')) {
                return "🧬 Possible Diagnosis: Flu or viral infection\n\n💊 Treatment: Paracetamol 500mg (1 tablet every 6 hours as needed)\n\n🛡 Prevention: Rest and drink plenty of fluids. If symptoms persist beyond 3 days, consult a doctor.";
            } else if (lowerMessage.includes('stress') || lowerMessage.includes('تناؤ')) {
                return "🧬 Possible Diagnosis: Tension headache\n\n💊 Treatment: Ibuprofen 200-400mg every 6 hours as needed\n\n🛡 Prevention: Practice relaxation techniques and consider stress management if frequent.";
            } else {
                return "🧬 Possible Diagnosis: Common headache\n\n💊 Treatment: Aspirin (325-650mg every 4 hours) or Acetaminophen (500mg every 6 hours)\n\n🛡 Prevention: Ensure proper hydration and rest. If severe or persistent, seek medical attention.";
            }
        } else if (lowerMessage.includes('stomach pain') || lowerMessage.includes('پیٹ میں درد')) {
            return "🧬 Possible Diagnosis: Indigestion or gastritis\n\n💊 Treatment: Antacids (like Mylanta or Tums) as directed\n\n🛡 Prevention: Avoid spicy/greasy foods, try BRAT diet (Bananas, Rice, Applesauce, Toast). If pain is severe or lasts >24 hours, see a doctor.";
        } else {
            const defaultResponses = [
                "I understand you're not feeling well. Could you please describe your symptoms in more detail?",
                "To help you better, please provide more details about your symptoms, their duration, and severity.",
                "🧬 I need more information for a proper assessment\n\n💊 Please describe: 1) Specific symptoms 2) Duration 3) Any other relevant health information\n\n🛡 General advice: Stay hydrated and monitor your symptoms"
            ];
            
            return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
        }
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Convert line breaks to <br> tags
        const formattedText = text.replace(/\n/g, '<br>');
        contentDiv.innerHTML = formattedText;
        
        messageDiv.appendChild(contentDiv);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeDiv.textContent = timeString;
        
        messageDiv.appendChild(timeDiv);
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typingDiv.appendChild(dot);
        }
        
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }
    
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function toggleVoiceInput() {
        if (!recognition) {
            addMessage("Speech recognition is not supported in your browser. Please type your symptoms instead.", 'ai');
            return;
        }
        
        if (isListening) {
            recognition.stop();
        } else {
            recognition.lang = currentLanguage === 'english' ? 'en-US' : 'ur-PK';
            recognition.start();
        }
    }
    
    function toggleLanguage() {
        currentLanguage = currentLanguage === 'english' ? 'urdu' : 'english';
        
        if (currentLanguage === 'english') {
            langToggle.innerHTML = '<i class="fas fa-language"></i> English';
            chatInput.placeholder = 'Describe your symptoms here...';
        } else {
            langToggle.innerHTML = '<i class="fas fa-language"></i> اردو';
            chatInput.placeholder = 'اپنی علامات یہاں بیان کریں...';
        }
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');
    
    mobileMenuBtn.addEventListener('click', function() {
        nav.classList.toggle('active');
    });
});