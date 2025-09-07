# Desmos AI Assistant

A Chrome extension that provides an AI-powered assistant for the Desmos graphing calculator. The assistant can help with equation solving, graph analysis, and provide step-by-step explanations.

## Features

- Interactive chat interface
- Real-time graph analysis
- Equation solving and explanations
- Step-by-step solutions
- Works directly within the Desmos calculator

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/desmos-ai-assistant.git
   cd desmos-ai-assistant
   ```

2. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

3. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

4. **Using the extension**
   - Navigate to [Desmos Calculator](https://www.desmos.com/calculator)
   - Click the extension icon to open the chat interface
   - Start asking questions about your graph!

## Development

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Building
1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements
- [Desmos](https://www.desmos.com/) for their amazing graphing calculator
- [Gemini API](https://ai.google.dev/) for the AI capabilities
