import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchChatSessions, createChatSession, deleteChatSession as apiDeleteChatSession, fetchChatMessages, searchChatMessages, requestAgentReply } from '../../api/chat';
import { fetchProjectFormLookups } from '../../api/projects';
import './ChatbotPage.css';

// ── Directive parser ──────────────────────────────────────────────────────────
const DIRECTIVE_RE = /<!--\s*DIRECTIVE:(.*?)\s*-->/gs;

function parseDirectives(text) {
  const directives = [];
  let clean = text;
  let m;
  DIRECTIVE_RE.lastIndex = 0;
  while ((m = DIRECTIVE_RE.exec(text)) !== null) {
    try {
      directives.push(JSON.parse(m[1]));
    } catch {
      // ignore malformed directive
    }
  }
  clean = text.replace(DIRECTIVE_RE, '').trim();
  return { clean, directives };
}

// ── Text formatter ────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatContent(text) {
  let h = escHtml(text);
  // Code blocks first (before other replacements)
  h = h.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  h = h.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  // Bold / italic
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Numbered lists
  h = h.replace(/^(\d+)\. (.+)$/gm, '<li class="ol-item">$2</li>');
  h = h.replace(/(<li class="ol-item">[\s\S]+?<\/li>(\n|$))+/g, m => `<ol>${m}</ol>`);
  // Bullet lists
  h = h.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[^<][\s\S]*?<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);
  // Pipe tables
  h = h.replace(/^\|(.+)\|$/gm, row => {
    const cells = row.split('|').slice(1, -1);
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
  });
  h = h.replace(/^\|[-: |]+\|$/gm, ''); // remove separator rows
  h = h.replace(/((<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>');
  // Horizontal rule
  h = h.replace(/^---+$/gm, '<hr>');
  // Newlines (after block elements to avoid double spacing)
  h = h.replace(/\n/g, '<br>');
  return { __html: h };
}

function genId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2, 7);
}

// ── Analysis Block (standalone component to avoid hooks-in-condition) ─────────
function AnalysisBlock({ directive }) {
  const [open, setOpen] = useState(false);
  const { title: blockTitle = '\uD83D\uDCCA SAM Analysis', content = '' } = directive;
  return (
    <div className="directive-analysis-block">
      <button className="analysis-toggle" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{flexShrink:0}}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{flex:1, textAlign:'left'}}>{blockTitle}</span>
        <span className="analysis-toggle-icon">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div
          className="analysis-content"
          dangerouslySetInnerHTML={formatContent(content)}
        />
      )}
    </div>
  );
}

// ── Directive Widget ──────────────────────────────────────────────────────────
function DirectiveWidget({ directive, onRespond, projectLookups }) {
  const { type, field, label, options = [], multi = true, project_id } = directive;

  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (type === 'dropdown') {
    const availableOptions = options.length > 0 ? options : (
      projectLookups?.lookups?.hasamex_users?.map(u => u.name) || []
    );

    const filtered = availableOptions.filter(o =>
      o.toLowerCase().includes(search.toLowerCase())
    );

    if (confirmed) {
      return (
        <div className="directive-confirmed">
          ✅ <strong>{label}:</strong> {selected.join(', ') || '—'}
        </div>
      );
    }

    // ── Single-select mode (client / PoC) ────────────────────────────────
    if (!multi) {
      return (
        <div className="directive-dropdown">
          <div className="directive-label">{label}</div>
          <input
            type="text"
            className="directive-search"
            placeholder={`Search ${label.toLowerCase()}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="directive-list">
            {filtered.length === 0 ? (
              <div className="directive-empty">No options found</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={`${field}-${i}-${opt}`}
                  className={`directive-list-item ${selected[0] === opt ? 'selected' : ''}`}
                  onClick={() => {
                    setConfirmed(true);
                    onRespond(opt);
                  }}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      );
    }

    // ── Multi-select mode (analyst / manager) ─────────────────────────────
    return (
      <div className="directive-dropdown">
        <div className="directive-label">{label}</div>
        <input
          type="text"
          className="directive-search"
          placeholder={`Search ${label.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="directive-list">
          {filtered.length === 0 ? (
            <div className="directive-empty">No options found</div>
          ) : (
            filtered.map((opt, i) => {
              const isChk = selected.includes(opt);
              return (
                <label
                  key={`${field}-${i}-${opt}`}
                  className={`directive-list-item directive-list-item--check ${isChk ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChk}
                    onChange={() => {
                      setSelected(prev =>
                        isChk ? prev.filter(s => s !== opt) : [...prev, opt]
                      );
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })
          )}
        </div>
        <button
          className="directive-confirm-btn"
          disabled={selected.length === 0}
          onClick={() => {
            setConfirmed(true);
            onRespond(selected.join(', '));
          }}
        >
          Confirm Selection ({selected.length} selected)
        </button>
      </div>
    );
  }

  if (type === 'approve_button') {
    if (confirmed) {
      return <div className="directive-confirmed">✅ Project submitted for creation…</div>;
    }
    return (
      <div className="directive-approve">
        <button
          className="directive-approve-btn"
          onClick={() => {
            setConfirmed(true);
            onRespond('__approve__');
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Approve &amp; Create Project
        </button>
      </div>
    );
  }

  if (type === 'project_link') {
    return (
      <div className="directive-project-link">
        <a href={`/projects/${project_id}`} target="_blank" rel="noopener noreferrer" className="directive-link-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          View Project #{project_id}
        </a>
      </div>
    );
  }

  // ── Analysis block (collapsible SAM output) ─────────────────────────────
  if (type === 'analysis_block') {
    return <AnalysisBlock directive={directive} />;
  }

  return null;
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onDirectiveRespond, projectLookups, showToast }) {
  const { clean, directives } = parseDirectives(msg.content || '');

  return (
    <div className={`msg-row ${msg.role}`}>
      {msg.role === 'ai' && (
        <div className="ai-av">
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
      )}
      <div className="msg-wrap">
        <div className="msg-bubble" dangerouslySetInnerHTML={formatContent(clean)} />

        {/* Inline directive widgets */}
        {msg.role === 'ai' && directives.map((d, i) => (
          <DirectiveWidget
            key={i}
            directive={d}
            onRespond={onDirectiveRespond}
            projectLookups={projectLookups}
          />
        ))}

        {msg.role === 'ai' && (
          <div className="msg-actions">
            <button className="ma-btn" onClick={() => { navigator.clipboard.writeText(msg.content); showToast('Copied to clipboard'); }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ChatbotPage ──────────────────────────────────────────────────────────
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
  const [searchMatchesSessions, setSearchMatchesSessions] = useState(null);
  const [projectLookups, setProjectLookups] = useState(null);

  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Pre-load project lookups for dropdown directives
  useEffect(() => {
    fetchProjectFormLookups().then(data => {
      setProjectLookups(data || {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sessions = await fetchChatSessions();
        if (sessions.length) {
          const m = {};
          sessions.forEach(s => {
            const created = s.created_at ? Date.parse(s.created_at) : Date.now();
            m[s.id] = { title: s.title, messages: [], created };
          });
          setChats(m);
          setActiveChatId(sessions.sort((a, b) => (Date.parse(b.created_at || 0)) - (Date.parse(a.created_at || 0)))[0].id);
        } else {
          await createChat();
        }
      } catch {
        await createChat();
      }
    })();
  }, []);

  useEffect(() => {
    scrollBottom();
  }, [chats, activeChatId, isTyping]);

  useEffect(() => {
    let timer = null;
    const q = String(searchFilter || '').trim();
    if (!q) {
      setSearchMatchesSessions(null);
      return;
    }
    timer = setTimeout(async () => {
      try {
        const results = await searchChatMessages({ query: q, limit: 100 });
        const idsSet = new Set(results.map(r => r.session_id));
        setSearchMatchesSessions(idsSet);
      } catch {
        setSearchMatchesSessions(null);
      }
    }, 300);
    return () => { if (timer) clearTimeout(timer); };
  }, [searchFilter]);

  const scrollBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  const createChat = async () => {
    const s = await createChatSession({ title: 'New conversation' });
    const id = s.id;
    setChats(prev => ({
      ...prev,
      [id]: { title: s.title, messages: [], created: s.created_at ? Date.parse(s.created_at) : Date.now() }
    }));
    setActiveChatId(id);
    if (inputRef.current) inputRef.current.focus();
    return id;
  };

  const openChat = async (id) => {
    setActiveChatId(id);
    if (!chats[id] || (chats[id].messages && chats[id].messages.length)) return;
    const msgs = await fetchChatMessages(id);
    // Filter out system state messages from display
    const mapped = msgs
      .filter(m => m.role !== 'system')
      .map(m => {
        const role = m.role === 'assistant' ? 'ai' : 'user';
        return { role, content: m.content_text };
      });
    setChats(prev => ({
      ...prev,
      [id]: { ...prev[id], messages: mapped }
    }));
  };

  const deleteChat = async (id, e) => {
    e.stopPropagation();
    try { await apiDeleteChatSession(id); } catch {}
    setChats(prev => {
      const newChats = { ...prev };
      delete newChats[id];
      return newChats;
    });
    if (activeChatId === id) {
      const remaining = Object.keys(chats).filter(x => x !== id);
      if (remaining.length) {
        setActiveChatId(remaining[0]);
      } else {
        setActiveChatId(null);
        await createChat();
      }
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const sendMessage = async (text = inputValue) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let chatId = activeChatId;
    if (!chatId || !chats[chatId]) {
      chatId = await createChat();
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
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const aiMsg = await requestAgentReply(chatId, { content_text: trimmed });
      setIsTyping(false);
      const reply = aiMsg && aiMsg.content_text ? aiMsg.content_text : '';
      if (reply) {
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
      }
    } catch {
      setIsTyping(false);
      showToast('Failed to get reply');
    }
  };

  // Called when a directive widget produces a user response
  const handleDirectiveRespond = useCallback((value) => {
    sendMessage(value);
  }, [activeChatId, chats]);

  const quickSend = (text) => sendMessage(text);

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
    if (!SpeechR) { showToast('Voice input requires Chrome or Edge'); return; }
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
    recognition.onend = recognition.onerror = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'ChatBot conversation', url: window.location.href }).catch(() => {});
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
    .filter(id => {
      if (!searchFilter) return true;
      const byTitle = chats[id].title.toLowerCase().includes(searchFilter.toLowerCase());
      const byContent = searchMatchesSessions ? searchMatchesSessions.has(id) : false;
      return byTitle || byContent;
    })
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
                <rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="9" y1="3" x2="9" y2="21"/>
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
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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
              <rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="9" y1="3" x2="9" y2="21"/>
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
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
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
                {/* Create Project — triggers the agent workflow */}
                <div className="sug-card" onClick={() => quickSend('create project')}>
                  <div className="sug-icon" style={{ background: 'rgba(25,195,125,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#19c37d" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="sug-title">Create Project</div>
                  <div className="sug-sub">Auto-extract from email & guided setup</div>
                </div>
                <div className="sug-card" onClick={() => quickSend('Help me find experts for a project. Filters: primary_sector=?, expert_function=?, region=?, years_of_experience>=?, availability window=?, and match to target companies if available. Show how to use the Experts page filters and relevant API endpoints.')}>
                  <div className="sug-icon" style={{ background: 'rgba(14,165,233,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#0ea5e9" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className="sug-title">Find Experts</div>
                  <div className="sug-sub">Guide filters for project needs</div>
                </div>
                <div className="sug-card" onClick={() => quickSend('Show engagement summary by status for a project or client (leads, invited, accepted, declined, scheduled, completed, goal, progress%). Also explain how to update an engagement (method, currencies, notes, payment status).')}>
                  <div className="sug-icon" style={{ background: 'rgba(168,85,247,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#a855f7" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  </div>
                  <div className="sug-title">Engagement Insights</div>
                  <div className="sug-sub">Leads, Invited, Accepted, Declined, Scheduled, Completed</div>
                </div>
                <div className="sug-card" onClick={() => quickSend('Find client users by client name, seniority, and location; show how to edit user details and assign client solution/sales team.')}>
                  <div className="sug-icon" style={{ background: 'rgba(245,158,11,.12)' }}>
                    <svg width="15" height="15" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <div className="sug-title">Users Queries</div>
                  <div className="sug-sub">Find and manage client users</div>
                </div>
              </div>
            </div>
          ) : (
            <div id="messages" className="visible">
              {activeChat && activeChat.messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  onDirectiveRespond={handleDirectiveRespond}
                  projectLookups={projectLookups}
                  showToast={showToast}
                />
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
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Search
              </button>
              <button className={`itool ${isRecording ? 'recording' : ''}`} onClick={handleMicClick} title="Voice input">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
              <button id="send-btn" onClick={() => sendMessage()} className={inputValue.trim() ? 'ready' : ''} title="Send">
                <svg width="15" height="15" fill="none" stroke={inputValue.trim() ? '#111' : '#555'} strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
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
