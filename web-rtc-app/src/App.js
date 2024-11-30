import React from 'react';
import WebRTC from './components/WebRTC';
import { Github, Twitter, Linkedin } from 'lucide-react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🌐 SyncSphere: WebRTC Video Chat</h1>
        <div className="social-links">
          <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer">
            <Github />
          </a>
          <a href="https://twitter.com/yourusername" target="_blank" rel="noopener noreferrer">
            <Twitter />
          </a>
          <a href="https://linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer">
            <Linkedin />
          </a>
        </div>
      </header>
      
      <main className="App-main">
        <WebRTC />
      </main>
      
      <footer className="App-footer">
        <p>Made with ❤️ by Hackasauraus</p>
      </footer>
    </div>
  );
}

export default App;