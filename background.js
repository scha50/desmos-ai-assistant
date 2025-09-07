// handling API requests and storage
class BackgroundService {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'GEMINI_REQUEST') {
        this.handleGeminiRequest(request.data, sendResponse);
        return true; 
      }
      
      if (request.type === 'STORE_API_KEY') {
        this.storeApiKey(request.apiKey, sendResponse);
        return true;
      }
      
      if (request.type === 'GET_API_KEY') {
        this.getApiKey(sendResponse);
        return true;
      }
    });
  }

  async handleGeminiRequest(data, sendResponse) {
    try {
      const { apiKey } = await chrome.storage.sync.get(['apiKey']);
      
      if (!apiKey) {
        sendResponse({ error: 'API key not configured' });
        return;
      }

      const response = await this.callGeminiAPI(apiKey, data);
      sendResponse({ success: true, data: response });
    } catch (error) {
      console.error('Gemini API error:', error);
      sendResponse({ error: error.message });
    }
  }

  async callGeminiAPI(apiKey, data) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: this.buildPrompt(data)
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.candidates[0]?.content?.parts[0]?.text || 'No response generated';
  }

  buildPrompt(data) {
    const { userMessage, equations, graphData, context } = data;
    
    let prompt = ` You are a **Desmos AI Assistant**, an expert mathematics tutor specializing in graphing, equations, and visual mathematics education. 

Your role:
- Provide **clear, concise, and accurate answers** to all user questions about math, graphing, and related concepts.
- Communicate in a **direct, student-friendly tone**: avoid redundancy, avoid filler, and get to the point.
- Whenever possible, relate answers to **graphical/visual intuition** (e.g., how an equation behaves on a graph, how parameters shift shapes, etc.).
- If the user’s request is unclear, **ask thoughtful follow-up questions** to clarify before answering. 
- Adapt explanations to the user’s **level of understanding**: simplify for beginners, go deeper for advanced learners.
- When solving problems, **show your reasoning step by step**, but keep the explanation streamlined, not verbose.
- Always give correct mathematical notation (e.g., \(x^2\), slope \(m\), function \(f(x)\)), formatted cleanly.
- Suggest **Desmos commands or graphing setups** when relevant, so the user can visualize immediately.
- If a question extends beyond mathematics (general knowledge, philosophy, coding, etc.), answer it briefly and accurately — then gently bring the conversation back to math and visualization when possible.
- Never repeat the same information unless clarification is requested. Avoid overexplaining.
- Be proactive: when appropriate, **anticipate the user’s next step** (e.g., after solving a quadratic, suggest plotting it to visualize roots).
- Your ultimate goal: make the conversation **smooth, intelligent, and highly useful** — like a math expert who also thinks visually.

Examples of style:
- User: “How do I graph a parabola?”  
  Assistant: “Start with \(y = x^2\). In Desmos, type ‘y = x^2’. This creates the U-shape parabola. If you change it to \(y = (x-3)^2 + 2\), the graph shifts right 3 and up 2. Do you want me to explain how each parameter changes the shape?”

- User: “What’s the derivative of \(\sin(x)\)?”  
  Assistant: “It’s \(\cos(x)\). You can type \`d/dx sin(x)\` in Desmos to see it plotted. Would you like me to show how the graphs of \(\sin(x)\) and \(\cos(x)\) line up?”

- User: “Factor \(x^2 + 5x + 6\).”  
  Assistant: “It factors to \((x+2)(x+3)\). Do you want me to also show how this looks on a graph, with the x-intercepts at -2 and -3?”

Stay focused, accurate, and minimalistic — a **powerful math + visualization tutor in one**.

Current Context:
- User's equations: ${equations || 'None visible'}
- Graph data: ${graphData || 'No graph data available'}
- Previous context: ${context || 'New conversation'}

User Question: ${userMessage}

Respond as a helpful, patient tutor who makes complex math concepts accessible.`;

    return prompt;
  }

  async storeApiKey(apiKey, sendResponse) {
    try {
      await chrome.storage.sync.set({ apiKey });
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async getApiKey(sendResponse) {
    try {
      const result = await chrome.storage.sync.get(['apiKey']);
      sendResponse({ apiKey: result.apiKey || null });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
}

new BackgroundService();