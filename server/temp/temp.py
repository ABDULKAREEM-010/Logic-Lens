<<<<<<< HEAD

# Intentional Syntax Error (missing colon)
def greet(name)
    print("Hello", name)

# Semantic Error: Using variable before assignment
def calculate():
    total += 10  # ❌ total not defined
    print(total)


calculate()
=======
#!/usr/bin/env python3
import os
import tempfile
from gtts import gTTS
import pygame
from openai import OpenAI
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import time

# Initialize OpenAI client if available
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

def get_ai_response(user_input):
    """Generate AI response."""
    if openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful voice assistant. Keep responses concise and conversational, under 100 words."},
                    {"role": "user", "content": user_input}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI API error: {e}")
    
    # Simple rule-based responses
    user_input_lower = user_input.lower()
    
    if any(greeting in user_input_lower for greeting in ['hello', 'hi', 'hey']):
        return "Hello! I'm your fast voice assistant. How can I help you today?"
    elif 'time' in user_input_lower:
        return f"The current time is {time.strftime('%I:%M %p')}"
    elif any(word in user_input_lower for word in ['weather', 'temperature']):
        return "I don't have access to weather data, but I can help you with other questions!"
    elif any(word in user_input_lower for word in ['name', 'who are you']):
        return "I'm your fast voice assistant, powered by open-source AI models."
    elif 'help' in user_input_lower:
        return "I can have live conversations with you using your microphone! Just click the microphone button and start speaking."
    elif any(word in user_input_lower for word in ['bye', 'goodbye']):
        return "Goodbye! It was nice talking with you!"
    elif 'fast' in user_input_lower or 'speed' in user_input_lower:
        return "I'm optimized for speed using the Web Speech API for instant recognition!"
    else:
        return f"You said: '{user_input}'. I'm a voice assistant. Try asking me about the time or saying hello!"

def text_to_speech(text):
    """Convert text to speech and return audio file path."""
    try:
        tts = gTTS(text=text, lang='en', slow=False)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tts.save(temp_file.name)
        return temp_file.name
    except Exception as e:
        print(f"TTS error: {e}")
        return None

class FastVoiceHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>Fast Voice Agent</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(15px);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            width: 100%;
            max-width: 800px;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .voice-controls {
            text-align: center;
            margin: 30px 0;
        }
        .mic-button {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            border: none;
            color: white;
            font-size: 3em;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            margin: 10px;
        }
        .mic-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        .mic-button.listening {
            background: linear-gradient(45deg, #2ed573, #1e90ff);
            animation: pulse 1.5s ease-in-out infinite alternate;
        }
        .mic-button.processing {
            background: linear-gradient(45deg, #ffa726, #ffcc02);
        }
        @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.1); }
        }
        .status {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            font-size: 1.2em;
            min-height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .conversation {
            max-height: 300px;
            overflow-y: auto;
            margin: 20px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .message {
            margin: 15px 0;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .user-message {
            background: linear-gradient(45deg, #3742fa, #2f3542);
            margin-left: auto;
            text-align: right;
        }
        .assistant-message {
            background: linear-gradient(45deg, #2ed573, #1e90ff);
            margin-right: auto;
        }
        .text-input {
            display: flex;
            margin: 20px 0;
            gap: 10px;
        }
        .text-input input {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 25px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .text-input input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }
        .text-input button {
            padding: 15px 25px;
            border: none;
            border-radius: 25px;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .text-input button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .info-panel {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
        .error { background: rgba(255, 0, 0, 0.2); border: 1px solid rgba(255, 0, 0, 0.3); }
        .success { background: rgba(0, 255, 0, 0.2); border: 1px solid rgba(0, 255, 0, 0.3); }
        .warning { background: rgba(255, 165, 0, 0.2); border: 1px solid rgba(255, 165, 0, 0.3); }
        
        @media (max-width: 768px) {
            .container { padding: 20px; }
            h1 { font-size: 2em; }
            .mic-button { width: 100px; height: 100px; font-size: 2.5em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>â¡ Fast Voice Agent</h1>
        
        <div class="voice-controls">
            <button id="micButton" class="mic-button" onclick="toggleListening()">ð¤</button>
            <div class="status" id="status">Click the microphone to start talking</div>
        </div>
        
        <div class="conversation" id="conversation">
            <div class="message assistant-message">
                Hello! I'm your lightning-fast voice assistant using Web Speech API for instant recognition. Click the microphone and start speaking!
            </div>
        </div>
        
        <div class="text-input">
            <input type="text" id="textInput" placeholder="Or type your message here...">
            <button onclick="sendTextMessage()">Send</button>
        </div>
        
        <div class="info-panel">
            <h3>â¡ Lightning Fast Voice Agent</h3>
            <ul class="feature-list">
                <li>â Instant speech recognition with Web Speech API</li>
                <li>â Real-time conversation flow</li>
                <li>â Sub-second response times</li>
                <li>â Completely free to use</li>
                <li>â Works in Chrome, Edge, Safari</li>
                <li>â Mobile and desktop compatible</li>
            </ul>
        </div>
        
        <audio id="responseAudio" autoplay style="display: none;"></audio>
    </div>

    <script>
        let isListening = false;
        let recognition = null;
        let conversationDiv = document.getElementById('conversation');
        let statusDiv = document.getElementById('status');
        let micButton = document.getElementById('micButton');
        
        // Initialize Speech Recognition with fallback
        function initializeSpeechRecognition() {
            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
            } else if ('SpeechRecognition' in window) {
                recognition = new SpeechRecognition();
            } else {
                statusDiv.textContent = 'â Speech recognition not supported in this browser. Try Chrome, Edge, or Safari.';
                statusDiv.classList.add('error');
                micButton.disabled = true;
                return false;
            }
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = function() {
                statusDiv.textContent = 'ð¤ Listening... Speak now!';
                statusDiv.classList.remove('error', 'success', 'warning');
                micButton.classList.add('listening');
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                addMessage(transcript, 'user');
                processVoiceInput(transcript);
            };
            
            recognition.onerror = function(event) {
                console.log('Speech recognition error:', event.error);
                if (event.error === 'network') {
                    statusDiv.textContent = 'â Network error. Check your internet connection and try again.';
                } else if (event.error === 'not-allowed') {
                    statusDiv.textContent = 'â Microphone access denied. Please allow microphone access and refresh.';
                } else {
                    statusDiv.textContent = 'â Speech recognition error: ' + event.error;
                }
                statusDiv.classList.add('error');
                micButton.classList.remove('listening');
                isListening = false;
            };
            
            recognition.onend = function() {
                micButton.classList.remove('listening');
                isListening = false;
                if (!statusDiv.textContent.includes('â') && !statusDiv.textContent.includes('Processing')) {
                    statusDiv.textContent = 'Click the microphone to start talking';
                    statusDiv.classList.remove('error', 'success', 'warning');
                }
            };
            
            return true;
        }
        
        function toggleListening() {
            if (!recognition && !initializeSpeechRecognition()) {
                return;
            }
            
            if (isListening) {
                recognition.stop();
                statusDiv.textContent = 'Click the microphone to start talking';
                statusDiv.classList.remove('error', 'success', 'warning');
            } else {
                try {
                    recognition.start();
                    isListening = true;
                } catch (error) {
                    statusDiv.textContent = 'â Could not start speech recognition: ' + error.message;
                    statusDiv.classList.add('error');
                }
            }
        }
        
        function addMessage(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message`;
            messageDiv.textContent = text;
            conversationDiv.appendChild(messageDiv);
            conversationDiv.scrollTop = conversationDiv.scrollHeight;
        }
        
        async function processVoiceInput(text) {
            statusDiv.textContent = 'â¡ Processing your message...';
            statusDiv.classList.add('warning');
            micButton.classList.add('processing');
            
            try {
                const response = await fetch('/process_voice', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });
                
                const result = await response.json();
                
                micButton.classList.remove('processing');
                
                if (result.error) {
                    addMessage('Error: ' + result.error, 'assistant');
                    statusDiv.textContent = 'â Error processing message';
                    statusDiv.classList.add('error');
                    statusDiv.classList.remove('warning');
                } else {
                    addMessage(result.response, 'assistant');
                    statusDiv.textContent = 'â Ready - Click microphone to continue talking';
                    statusDiv.classList.add('success');
                    statusDiv.classList.remove('warning');
                    
                    // Play audio response
                    if (result.audio_url) {
                        const audio = document.getElementById('responseAudio');
                        audio.src = result.audio_url;
                        audio.play().catch(e => console.log('Audio autoplay prevented:', e));
                    }
                }
            } catch (error) {
                micButton.classList.remove('processing');
                addMessage('Connection error: ' + error.message, 'assistant');
                statusDiv.textContent = 'â Connection error';
                statusDiv.classList.add('error');
                statusDiv.classList.remove('warning');
            }
        }
        
        async function sendTextMessage() {
            const textInput = document.getElementById('textInput');
            const text = textInput.value.trim();
            
            if (!text) return;
            
            addMessage(text, 'user');
            textInput.value = '';
            
            await processVoiceInput(text);
        }
        
        // Allow Enter key to send text messages
        document.getElementById('textInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendTextMessage();
            }
        });
        
        // Initialize on page load
        window.addEventListener('load', function() {
            initializeSpeechRecognition();
        });
    </script>
</body>
</html>
            """
            self.wfile.write(html_content.encode())
        
        elif self.path.startswith('/audio/'):
            # Serve audio files
            filename = self.path[7:]  # Remove '/audio/' prefix
            try:
                with open(f'/tmp/{filename}', 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-type', 'audio/mpeg')
                    self.send_header('Cache-Control', 'no-cache')
                    self.end_headers()
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/process_voice':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode())
                
                text = data.get('text', '')
                if text:
                    # Get AI response (fast processing)
                    ai_response = get_ai_response(text)
                    
                    # Convert to speech (runs in background)
                    audio_file = text_to_speech(ai_response)
                    audio_url = f"/audio/{os.path.basename(audio_file)}" if audio_file else None
                    
                    response = {
                        "response": ai_response,
                        "audio_url": audio_url
                    }
                else:
                    response = {"error": "No text provided"}
                
            except Exception as e:
                response = {"error": f"Processing error: {str(e)}"}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    server = HTTPServer(('0.0.0.0', 5000), FastVoiceHandler)
    print("Fast Voice Agent running on http://0.0.0.0:5000")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
>>>>>>> 6b2bfc3 (github integration and selecting a file)
