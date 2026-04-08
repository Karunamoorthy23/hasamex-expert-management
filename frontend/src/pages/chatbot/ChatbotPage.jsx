import React, { useState, useEffect, useRef } from 'react';
import './ChatbotPage.css';

const RESPONSES = [
  `That's an interesting question. Here's a clear breakdown:\n\nThe core idea revolves around understanding the underlying principles rather than memorizing surface-level facts. When you approach it this way, patterns emerge naturally.\n\nWould you like me to dive deeper into any specific aspect?`,
  `Great — let me walk you through this step by step.\n\n**First**, we establish the foundation. Every complex system is built on simpler components that interact in predictable ways.\n\n**Second**, we look at how those components relate to each other and what emergent properties arise.\n\nFeel free to ask follow-up questions!`,
  `Here's what I've got for you:\n\n• The primary consideration here is efficiency — doing the most with the least overhead.\n• Secondary factors include maintainability, readability, and scalability.\n• Finally, always consider the human element — who will use or maintain this?\n\nLet me know if you'd like examples or further elaboration.`,
  `Absolutely! This is a nuanced topic worth unpacking carefully.\n\nThe short answer: it depends on context. The longer answer involves weighing trade-offs between competing priorities, which is where most of the complexity lives.\n\nI'd suggest starting with the simplest solution that works, then optimizing only where measurements show it's needed.`,
  `Here's a practical take on this:\n\n\`\`\`python\ndef solve(input_data):\n    # Process the input\n    result = [item for item in input_data if item is not None]\n    return sorted(result, key=lambda x: x.get('priority', 0))\n\`\`\`\n\nThis pattern handles the most common cases cleanly. Adjust the lambda function based on your specific sorting criteria.`,
];

function genId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatContent(text) {
  let h = escHtml(text);
  h = h.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/^• (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');
  h = h.replace(/\n/g, '<br>');
  return { __html: h };
}

export default function ChatbotPage() {
  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initial chat creation
    if (Object.keys(chats).length === 0) {
      createChat();
    }
  }, []);

  useEffect(() => {
    scrollBottom();
  }, [chats, activeChatId, isTyping]);

  const scrollBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  const createChat = () => {
    const id = genId();
    setChats(prev => ({
      ...prev,
      [id]: { title: 'New conversation', messages: [], created: Date.now() }
    }));
    setActiveChatId(id);
    if (inputRef.current) inputRef.current.focus();
    return id;
  };

  const openChat = (id) => {
    setActiveChatId(id);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    setChats(prev => {
      const newChats = { ...prev };
      delete newChats[id];
      return newChats;
    });
    if (activeChatId === id) {
      setActiveChatId(null);
      createChat();
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const sendMessage = (text = inputValue) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let chatId = activeChatId;
    if (!chatId || !chats[chatId]) {
      chatId = createChat();
    }

    setChats(prev => {
      const chat = prev[chatId];
      const newTitle = chat.title === 'New conversation' 
        ? (trimmed.length > 36 ? trimmed.slice(0, 36) + '…' : trimmed)
        : chat.title;

      return {
        ...prev,
        [chatId]: {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, { role: 'user', content: trimmed }]
        }
      };
    });

    setInputValue('');
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const reply = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
      setChats(prev => {
        const chat = prev[chatId];
        return {
          ...prev,
          [chatId]: {
            ...chat,
            messages: [...chat.messages, { role: 'ai', content: reply }]
          }
        };
      });
    }, 800 + Math.random() * 900);
  };

  const quickSend = (text) => {
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleMicClick = () => {
    const SpeechR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechR) {
      showToast('Voice input requires Chrome or Edge');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = e => {
      const t = e.results[0][0].transcript;
      setInputValue(prev => (prev + ' ' + t).trim());
    };
    recognition.onend = recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'ChatBot conversation', url: window.location.href }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const toggleSearch = () => {
    setSearchVisible(prev => !prev);
    if (!searchVisible) setSearchFilter('');
  };

  const activeChat = activeChatId && chats[activeChatId] ? chats[activeChatId] : null;
  const isNewChat = !activeChat || activeChat.messages.length === 0;

  // History processing
  const ids = Object.keys(chats)
    .filter(id => !searchFilter || chats[id].title.toLowerCase().includes(searchFilter.toLowerCase()))
    .sort((a, b) => chats[b].created - chats[a].created);

  const now = Date.now();
  const todayIds = ids.filter(id => now - chats[id].created < 86400000);
  const earlierIds = ids.filter(id => now - chats[id].created >= 86400000);

  return (
    <div className="chatbot-page-wrapper">
      {/* SIDEBAR */}
      <div id="sidebar" className={isSidebarCollapsed ? 'collapsed' : ''}>
        <div className="sb-inner">
          <div className="sb-top">
            <button className="ib" onClick={toggleSidebar} title="Toggle sidebar">
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2.5"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>

            <button className="new-chat-btn" onClick={createChat}>
              <span className="plus-ic">
                <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </span>
              New chat
            </button>

            <button className="ib" onClick={toggleSearch} title="Search conversations">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>

          {searchVisible && (
            <div id="hist-search-wrap" style={{ padding: '0 10px 8px' }}>
              <input 
                id="hist-search" 
                placeholder="Search chats…"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                autoFocus
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', 
                  borderRadius: '9px', padding: '7px 12px', color: 'var(--text)', 
                  fontFamily: 'var(--font)', fontSize: '13px', outline: 'none'
                }} 
              />
            </div>
          )}

          <div className="sb-history" id="history-list">
            {!ids.length ? (
              <div className="empty-hist">No conversations yet.<br/>Start a new chat!</div>
            ) : (
              <>
                {todayIds.length > 0 && (
                  <>
                    <div className="hist-group-label">Today</div>
                    {todayIds.map(id => (
                      <div key={id} className={`hist-item ${id === activeChatId ? 'active' : ''}`} onClick={() => openChat(id)}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: .55 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>{chats[id].title}</span>
                        <button className="hist-del" title="Delete" onClick={(e) => deleteChat(id, e)}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {earlierIds.length > 0 && (
                  <>
                    <div className="hist-group-label">Earlier</div>
                    {earlierIds.map(id => (
                      <div key={id} className={`hist-item ${id === activeChatId ? 'active' : ''}`} onClick={() => openChat(id)}>
                         <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: .55 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>{chats[id].title}</span>
                        <button className="hist-del" title="Delete" onClick={(e) => deleteChat(id, e)}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <div className="sb-footer">
            <div className="user-row">
              <div className="avatar">K</div>
              <div className="user-info">
                <div className="user-name">Karuna</div>
              </div>
              <span className="user-plan">Free</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div id="main">
        {/* topbar */}
        <div className="topbar">
          <button className="ib" onClick={toggleSidebar} title="Open sidebar" style={{ display: isSidebarCollapsed ? 'flex' : 'none' }}>
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2.5"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>

          <button className="model-pill">
            <span className="model-dot"></span>
            ChatBot
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          <div className="topbar-right">
            <button className="share-btn" onClick={handleShare}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>
            <button className="ib" title="Settings">
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* chat area */}
        <div id="chat-area" ref={chatAreaRef}>
          {isNewChat ? (
            <div id="welcome">
              <div className="welcome-logo">
                <svg width="26" height="26" fill="none" stroke="url(#wg)" strokeWidth="1.8" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#19c37d"/>
                      <stop offset="100%" stopColor="#0ea5e9"/>
                    </linearGradient>
                  </defs>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h1>How can I help?</h1>
              <p>Ask me anything, or pick a suggestion below.</p>
              <div className="suggestion-grid">
                <div className="sug-card" onClick={() => quickSend('Explain how machine learning works in simple terms')}>
                  <div className="sug-icon" style={{ background: 'rgba(25,195,125,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#19c37d" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="sug-title">Create Project</div>
                  <div className="sug-sub">Share project details to create a project</div>
                </div>
                <div className="sug-card" onClick={() => quickSend('Write a professional email to reschedule a client meeting')}>
                  <div className="sug-icon" style={{ background: 'rgba(14,165,233,.12)' }}>
                     <svg width="15" height="15" fill="none" stroke="#0ea5e9" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className="sug-title">Find Experts</div>
                  <div className="sug-sub">Find experts for a project</div>
                </div>
                <div className="sug-card" onClick={() => quickSend('Write a Python function to fetch and parse JSON from an API')}>
                   <div className="sug-icon" style={{ background: 'rgba(168,85,247,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#a855f7" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  </div>
                  <div className="sug-title">Solve Queries</div>
                  <div className="sug-sub">Query the database</div>
                </div>
                <div className="sug-card" onClick={() => quickSend('Give me 5 creative SaaS startup ideas for 2025')}>
                  <div className="sug-icon" style={{ background: 'rgba(245,158,11,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
                       <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <div className="sug-title">Brainstorm ideas</div>
                  <div className="sug-sub">Creative SaaS startup concepts</div>
                </div>
              </div>
            </div>
          ) : (
            <div id="messages" className="visible">
              {activeChat && activeChat.messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role}`}>
                  {m.role === 'ai' && (
                    <div className="ai-av">
                      <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                  )}
                  <div className="msg-wrap">
                    <div className="msg-bubble" dangerouslySetInnerHTML={formatContent(m.content)} />
                    {m.role === 'ai' && (
                      <div className="msg-actions">
                        <button className="ma-btn" onClick={() => { navigator.clipboard.writeText(m.content); showToast('Copied to clipboard'); }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Copy
                        </button>
                        <button className="ma-btn" title="Thumbs up">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                          </svg>
                        </button>
                        <button className="ma-btn" title="Thumbs down">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                            <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                          </svg>
                        </button>
                        <button className="ma-btn" title="Regenerate">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                          </svg>
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div id="typing" className="typing-row">
                  <div className="ai-av">
                    <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="typing-dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* input area */}
        <div id="input-area" className={isNewChat ? "new-chat-mode" : ""}>
          <div className="input-wrapper">
            <textarea 
              id="msg-input" 
              ref={inputRef}
              rows="1" 
              placeholder="Message ChatBot…"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            ></textarea>
            <div className="input-bottom">
              <button className="itool-label" title="Attach file">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                Attach
              </button>
              <button className="itool-label" title="Search web">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Search
              </button>
              <button className={`itool ${isRecording ? 'recording' : ''}`} onClick={handleMicClick} title="Voice input">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
              <button id="send-btn" onClick={() => sendMessage()} className={inputValue.trim() ? 'ready' : ''} title="Send">
                <svg width="15" height="15" fill="none" stroke={inputValue.trim() ? '#111' : '#555'} strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="copy-toast" className={toastMsg ? 'show' : ''}>{toastMsg}</div>
    </div>
  );
}
