// content that runs on Desmos pages
class DesmosAIAssistant {
  constructor() {
    this.chatWindow = null;
    this.messagesArea = null;
    this.isMinimized = false;
    this.chatHistory = [];
    this.currentGraphState = null;
    this.init();
  }

  async init() {
    if (window.location.hostname.includes("desmos.com")) {
      this.createChatInterface();
      
      
      const waitForDesmos = () => {
        return new Promise((resolve) => {
          if (window.Calc) {
            resolve();
          } else {
            const checkInterval = setInterval(() => {
              if (window.Calc) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          }
        });
      };
      
      try {
        await waitForDesmos();
        this.setupGraphObservation();
        this.currentGraphState = this.readDesmosState();
      } catch (error) {
        console.error("Error initializing Desmos AI Assistant:", error);
      }
    }
  }

  
  readDesmosState() {
    try {
      if (!window.Calc) return { expressions: [], viewport: null };

      const expressions = Calc.getExpressions().map(expr => ({
        id: expr.id,
        type: expr.type,
        latex: expr.latex || null,
        text: expr.text || null,
        color: expr.color || null,
        hidden: !!expr.hidden
      }));

      const viewport = Calc.getViewport();

      return {
        expressions,
        viewport,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error("Error reading Desmos state:", err);
      return { expressions: [], viewport: null };
    }
  }


  setupGraphObservation() {
    if (typeof window.Calc === 'undefined') {
      console.warn("Desmos Calc API not available");
      return;
    }


    let updateInProgress = false;
    const updateState = async () => {
      if (updateInProgress) return;
      updateInProgress = true;
      
      try {
        this.currentGraphState = this.readDesmosState();
      } catch (error) {
        console.error("Error updating graph state:", error);
      } finally {
        updateInProgress = false;
      }
    };

    try {
      if (typeof Calc.observeEvent === 'function') {
        Calc.observeEvent("change", updateState);
        setTimeout(updateState, 500);
      } else {
        console.warn("Calc.observeEvent not available, using fallback");
        setInterval(updateState, 2000);
      }
    } catch (error) {
      console.error("Error setting up graph observation:", error);
    }
  }

  getGraphContext() {
    try {
      if (!this.currentGraphState || !this.currentGraphState.viewport) {
        return "No graph context available. Make sure you're on a Desmos calculator page.";
      }

      const { expressions = [], viewport } = this.currentGraphState;
      let context = "## Current Graph State\n";

      // Safely format viewport information
      try {
        context += `### Viewport\n`;
        context += `- X-axis: [${Number(viewport.xmin).toFixed(2)}, ${Number(viewport.xmax).toFixed(2)}]\n`;
        context += `- Y-axis: [${Number(viewport.ymin).toFixed(2)}, ${Number(viewport.ymax).toFixed(2)}]\n\n`;
      } catch (e) {
        console.error("Error formatting viewport:", e);
      }

      // Handle expressions
      if (Array.isArray(expressions) && expressions.length > 0) {
        const visibleExpressions = expressions.filter(e => e && !e.hidden && e.latex);
        
        if (visibleExpressions.length > 0) {
          context += "### Equations and Expressions\n";
          visibleExpressions.forEach((expr, i) => {
            try {
             
              const safeLatex = String(expr.latex || '').replace(/`/g, '\`');
              context += `${i + 1}. \`${safeLatex}\``;
              if (expr.color) context += ` (${expr.color})`;
              context += '\n';
            } catch (e) {
              console.error("Error formatting expression:", e);
            }
          });
        } else {
          context += "No visible equations or expressions on the graph.\n";
        }
      } else {
        context += "No equations or expressions found.\n";
      }

      return context;
    } catch (error) {
      console.error("Error getting graph context:", error);
      return "Error getting graph context.";
    }
  }

  async sendToGemini(userMessage) {
    try {
      // Using hardcoded API key
      const apiKey = "your_actual_api_key_here";
      
      if (!apiKey) {
        throw new Error("API key not configured. Please update the extension with a valid Gemini API key.");
      }

    
      if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        throw new Error("Please enter a valid message.");
      }

   
      const desmosContext = this.getGraphContext();
      
    
      const prompt = `You are a helpful graphing tutor chatbot that specializes in answering questions about graphing functions, equations, and inequalities using Desmos. Be student-friendly by avoiding overcomplication unless the user asks for advanced details, giving tips for visualizing transformations. Stay grounded: if a question is outside the scope of graphing or Desmos, politely redirect or say you don’t know, and never invent unsupported math rules. When needed, retrieve relevant knowledge such as graph types (linear, quadratic, exponential, trigonometric, etc.), Desmos input syntax (e.g., y=x^2, y=sin(x), {x>0}y=x), features of Desmos (sliders, restrictions, tables, etc.), and step-by-step graphing strategies. Always begin by understanding the user’s intent, whether they want to plot equations, apply transformations, work with inequalities, piecewise or parametric functions, polar equations, regressions, restrictions, or interpret graphs by analyzing slope, intercepts, asymptotes, intersections, domain, or range.

User's question: ${userMessage}

Current Desmos graph context:
${desmosContext}

Please provide a clear and concise response.`;


      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      });

      if (!response.ok) throw new Error("Gemini request failed");

      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    } catch (err) {
      console.error("Gemini error:", err);
      return "⚠️ Error: " + err.message;
    }
  }


  injectDesmosObserver() {
    
    const observer = new MutationObserver((mutations) => {
      
      this.currentGraphState = this.readDesmosState();
    });
    
    
    const calculatorContainer = document.querySelector('.dcg-graph-inner');
    if (calculatorContainer) {
      observer.observe(calculatorContainer, { 
        childList: true, 
        subtree: true,
        attributes: true
      });
    }
  }

  readDesmosState() {
    try {
      if (!window.Calc) {
        console.warn("Desmos Calc object not found");
        return { expressions: [], viewport: null };
      }
  
     
      const state = window.Calc.getState();
      const expressions = Calc.getExpressions()
        .filter(expr => !expr.hidden)
        .map(expr => ({
          id: expr.id,
          type: expr.type,
          latex: expr.latex,
          text: expr.text,
          color: expr.color || null
        }));
  
      const viewport = Calc.getViewport();
  
      return {
        expressions,
        viewport,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error("Error reading Desmos state:", e);
      return { expressions: [], viewport: null };
    }
  }

  createChatInterface() {
    // chat window
    this.chatWindow = this.createElement('div', {
      id: 'desmos-ai-chat',
      className: 'desmos-ai-chat-window'
    });
    const header = this.createElement('div', {
      className: 'chat-header'
    });

    const title = this.createElement('div', {
      className: 'chat-title',
      textContent: 'AI Assistant'
    });
    const controls = this.createElement('div', {
      className: 'chat-controls'
    });

    const minimizeBtn = this.createElement('button', {
      className: 'control-btn minimize-btn',
      innerHTML: '−',
      onclick: () => this.toggleMinimize()
    });

    controls.appendChild(minimizeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    // Chat messages area
    this.messagesArea = this.createElement('div', {
      id: 'chat-messages',
      className: 'chat-messages'
    });

 
    this.addMessage('assistant', 'Hi! I\'m your Desmos AI Assistant. I can help you understand graphs, create equations, debug problems, and guide you through step-by-step solutions. What would you like to explore?');

    
    const inputArea = this.createElement('div', {
      className: 'chat-input-area'
    });

    const input = this.createElement('input', {
      type: 'text',
      id: 'chat-input',
      className: 'chat-input',
      placeholder: 'Ask me about your graph or equation...',
      onkeypress: (e) => {
        if (e.key === 'Enter') this.sendMessage();
      }
    });

    const sendBtn = this.createElement('button', {
      className: 'send-btn',
      innerHTML: '→',
      onclick: () => this.sendMessage()
    });

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);

    
    this.chatWindow.appendChild(header);
    this.chatWindow.appendChild(this.messagesArea);
    this.chatWindow.appendChild(inputArea);

    
    this.makeDraggable(this.chatWindow, header);

    
    document.body.appendChild(this.chatWindow);
  }

  createElement(tag, props) {
    const element = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith('on')) {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'className') {
        element.className = value;
      } else {
        element[key] = value;
      }
    });
    return element;
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const messages = this.chatWindow.querySelector('.chat-messages');
    const inputArea = this.chatWindow.querySelector('.chat-input-area');
    const minimizeBtn = this.chatWindow.querySelector('.minimize-btn');
    const header = this.chatWindow.querySelector('.chat-header');

    if (this.isMinimized) {
      // hide content and show as circle
      messages.style.display = 'none';
      inputArea.style.display = 'none';
      header.style.display = 'none';
      minimizeBtn.innerHTML = '+';
      
      this.chatWindow.classList.add('minimized', 'bottom-right');
      
      this.chatWindow.style.cursor = 'pointer';
      this.chatWindow.onclick = (e) => {
        if (e.target === this.chatWindow) {
          this.toggleMinimize();
        }
      };
    } else {
     
      messages.style.display = 'flex';
      inputArea.style.display = 'flex';
      header.style.display = 'flex';
      minimizeBtn.innerHTML = '−';
      this.chatWindow.classList.remove('minimized');
      this.chatWindow.style.cursor = 'default';
      
      // restore to bottom-right
      this.chatWindow.style.top = '';
      this.chatWindow.style.left = '';
      this.chatWindow.style.right = '20px';
      this.chatWindow.style.bottom = '20px';
    }
  }

  makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    let startX, startY;
    
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (element.classList.contains('minimized')) {
        // if minimized, check if we're near a corner to snap
        const rect = element.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        
        // checks if we're near a corner (within 20px)
        const corners = [
          { x: rect.left, y: rect.top, class: 'top-left' },
          { x: rect.right, y: rect.top, class: 'top-right' },
          { x: rect.left, y: rect.bottom, class: 'bottom-left' },
          { x: rect.right, y: rect.bottom, class: 'bottom-right' }
        ];
        
        const corner = corners.find(corner => {
          return Math.abs(corner.x - e.clientX) < 20 && 
                 Math.abs(corner.y - e.clientY) < 20;
        });
        
        if (corner) {
          
          ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
            element.classList.remove(pos);
          });
          element.classList.add(corner.class);
          return;
        }
        
        // If not near a corner, start dragging the minimized window
        isDragging = true;
      } else {
        // Normal drag for non-minimized window
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }
    }

    function elementDrag(e) {
      e.preventDefault();
      
      if (isDragging) {
        // Move the minimized window
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // Update position
        element.style.left = (element.offsetLeft + dx) + 'px';
        element.style.top = (element.offsetTop + dy) + 'px';
        
        // Update start position for next move
        startX = e.clientX;
        startY = e.clientY;
      } else {
        
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        
        element.style.top = (element.offsetTop - pos2) + 'px';
        element.style.left = (element.offsetLeft - pos1) + 'px';
        
       
        ['top', 'bottom', 'left', 'right'].forEach(prop => {
          element.style[prop] = '';
        });
      }
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  getRecentContext() {
    // Return the last few messages for context
    return this.chatHistory
      .slice(-4) // Last 4 messages
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');
  }

  async sendMessage() {
    const input = this.chatWindow.querySelector('.chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // add user message to chat
    this.addMessage('user', message);
    input.value = '';
    this.showTypingIndicator();
    
    try {
      // sends message to Gemini
      const response = await this.sendToGemini(message);
      this.addMessage('assistant', response);
      
    } catch (error) {
      console.error('Error processing message:', error);
      this.addMessage('assistant', `Error: ${error.message}`);
    } finally {
      this.hideTypingIndicator();
    }
  }

  addMessage(sender, content) {
    if (!this.messagesArea) return;
    
    const messageDiv = this.createElement('div', {
      className: `message ${sender}-message`
    });

    const messageContent = this.createElement('div', {
      className: 'message-content',
      innerHTML: this.formatMessage(content)
    });

    messageDiv.appendChild(messageContent);
  
    if (this.messagesArea.firstChild) {
      this.messagesArea.insertBefore(messageDiv, this.messagesArea.firstChild);
    } else {
      this.messagesArea.appendChild(messageDiv);
    }
    
    this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    this.chatHistory.push({ sender, content, timestamp: Date.now() });
  }

  formatMessage(content) {
    
    let formatted = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    formatted = formatted
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    const lines = formatted.split('\n');
    let inCodeBlock = false;
    let result = [];
    
    for (const line of lines) {
      if (line.includes('<pre>')) inCodeBlock = true;
      if (line.includes('</pre>')) inCodeBlock = false;
      
      if (!inCodeBlock && line.trim() === '') {
        result.push('<br>');
      } else if (!inCodeBlock) {
        result.push(line + '<br>');
      } else {
        result.push(line);
      }
    }
    
    return result.join('\n').replace(/<br>\s*<br>/g, '<br>');
  }

  showTypingIndicator() {
    const messagesArea = this.chatWindow.querySelector('.chat-messages');
    if (!messagesArea) return;
    
    const typingDiv = this.createElement('div', {
      id: 'typing-indicator',
      className: 'message assistant-message typing'
    });
    
    const dots = this.createElement('div', {
      className: 'typing-dots',
      innerHTML: '<span></span><span></span><span></span>'
    });
    
    typingDiv.appendChild(dots);
    messagesArea.appendChild(typingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  hideTypingIndicator() {
    const typingIndicator = this.chatWindow?.querySelector('#typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  getRecentContext(maxMessages = 5) {
    if (!this.chatWindow) return '';
    
    const messageElements = this.chatWindow.querySelectorAll('.message:not(.typing)');
    const messages = [];
    
    // Get the last few messages (excluding the current one being processed)
    for (let i = Math.max(0, messageElements.length - maxMessages * 2); i < messageElements.length; i++) {
      const element = messageElements[i];
      const role = element.classList.contains('user-message') ? 'user' : 'assistant';
      const content = element.querySelector('.message-content')?.textContent || '';
      
      if (content.trim()) {
        messages.push({ role, content });
      }
    }
    
    // Format as a conversation history string
    return messages
      .slice(-maxMessages)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  sendToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  
}

// Initialize 
new DesmosAIAssistant();