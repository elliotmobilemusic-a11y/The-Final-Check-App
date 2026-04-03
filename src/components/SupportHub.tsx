import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildAssistantReply,
  createAssistantWelcome,
  getAllHelpPages,
  getHelpPage,
  type AppHelpPage
} from '../lib/appHelp';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function GuideDrawer({
  open,
  selectedPage,
  pages,
  onClose,
  onSelectPage,
  onOpenAssistant
}: {
  open: boolean;
  selectedPage: AppHelpPage;
  pages: AppHelpPage[];
  onClose: () => void;
  onSelectPage: (key: AppHelpPage['key']) => void;
  onOpenAssistant: () => void;
}) {
  if (!open) return null;

  return (
    <div className="drawer-backdrop support-backdrop" onClick={onClose}>
      <aside
        className="drawer-panel support-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="support-drawer-shell">
          <div className="support-drawer-header">
            <div>
              <div className="brand-badge">Help me</div>
              <h2>{selectedPage.title}</h2>
              <p>{selectedPage.summary}</p>
            </div>

            <div className="support-drawer-actions">
              <button className="button button-secondary" onClick={onOpenAssistant}>
                Ask a question
              </button>
              <button className="button button-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>

          <div className="support-drawer-layout">
            <nav className="support-page-nav">
              {pages.map((page) => (
                <button
                  className={`support-page-tab ${page.key === selectedPage.key ? 'active' : ''}`}
                  key={page.key}
                  onClick={() => onSelectPage(page.key)}
                  type="button"
                >
                  <strong>{page.title}</strong>
                  <span>{page.routeLabel}</span>
                </button>
              ))}
            </nav>

            <div className="support-guide-content">
              <section className="support-guide-section">
                <h3>Best way to use this page</h3>
                <ol className="support-list numbered">
                  {selectedPage.quickStart.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>

              {selectedPage.sections.map((section) => (
                <section className="support-guide-section" key={section.title}>
                  <div className="support-guide-heading">
                    <h3>{section.title}</h3>
                    <span className="soft-pill">How to use it</span>
                  </div>
                  <p className="muted-copy">{section.purpose}</p>

                  {section.steps?.length ? (
                    <ol className="support-list numbered">
                      {section.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}

                  {section.fields?.length ? (
                    <div className="support-field-grid">
                      {section.fields.map((field) => (
                        <article className="support-field-card" key={`${section.title}-${field.label}`}>
                          <strong>{field.label}</strong>
                          <p>{field.guidance}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}

              {selectedPage.tips.length ? (
                <section className="support-guide-section">
                  <div className="support-guide-heading">
                    <h3>Practical tips</h3>
                    <span className="soft-pill">Reduce admin</span>
                  </div>
                  <ul className="support-list">
                    {selectedPage.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function AssistantPanel({
  open,
  pathname,
  messages,
  input,
  onClose,
  onInputChange,
  onSubmit,
  onReset,
  onOpenGuide
}: {
  open: boolean;
  pathname: string;
  messages: ChatMessage[];
  input: string;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onOpenGuide: () => void;
}) {
  if (!open) return null;

  const page = getHelpPage(pathname);

  return (
    <div className="support-chat-card">
      <div className="support-chat-header">
        <div>
          <div className="brand-badge">Guided help</div>
          <h3>Workflow guide</h3>
          <p>{page.title} guidance loaded</p>
        </div>

        <div className="support-chat-actions">
          <button className="button button-ghost" onClick={onOpenGuide} type="button">
            Page guide
          </button>
          <button className="button button-ghost" onClick={onReset} type="button">
            New chat
          </button>
          <button className="button button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>

      <div className="support-chat-messages">
        {messages.map((message) => (
          <article
            className={`support-chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
            key={message.id}
          >
            <span>{message.role === 'assistant' ? 'Guide' : 'You'}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <form className="support-chat-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Ask about this page</span>
          <textarea
            className="input textarea"
            placeholder="Ask how to use a section, what a field means, or what order to work in."
            rows={4}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
          />
        </label>
        <button className="button button-primary" type="submit">
          Get guidance
        </button>
      </form>
    </div>
  );
}

export function SupportHub() {
  const location = useLocation();
  const pages = useMemo(() => getAllHelpPages(), []);
  const currentPage = useMemo(() => getHelpPage(location.pathname), [location.pathname]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedPageKey, setSelectedPageKey] = useState<AppHelpPage['key']>(currentPage.key);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid('assistant'),
      role: 'assistant',
      content: createAssistantWelcome(location.pathname)
    }
  ]);

  useEffect(() => {
    setSelectedPageKey(currentPage.key);
  }, [currentPage.key]);

  const selectedPage = useMemo(
    () => pages.find((page) => page.key === selectedPageKey) ?? currentPage,
    [currentPage, pages, selectedPageKey]
  );

  function resetChat() {
    setMessages([
      {
        id: uid('assistant'),
        role: 'assistant',
        content: createAssistantWelcome(location.pathname)
      }
    ]);
    setInput('');
  }

  function askQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      {
        id: uid('user'),
        role: 'user',
        content: trimmed
      },
      {
        id: uid('assistant'),
        role: 'assistant',
        content: buildAssistantReply(trimmed, location.pathname)
      }
    ]);
    setInput('');
    setAssistantOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askQuestion(input);
  }

  return (
    <>
      <div className="support-launcher">
        <button className="button button-secondary" onClick={() => setGuideOpen(true)} type="button">
          Help me
        </button>
        <button className="button button-primary" onClick={() => setAssistantOpen(true)} type="button">
          Ask guide
        </button>
      </div>

      <GuideDrawer
        open={guideOpen}
        selectedPage={selectedPage}
        pages={pages}
        onClose={() => setGuideOpen(false)}
        onSelectPage={setSelectedPageKey}
        onOpenAssistant={() => {
          setGuideOpen(false);
          setAssistantOpen(true);
        }}
      />

      <AssistantPanel
        open={assistantOpen}
        pathname={location.pathname}
        messages={messages}
        input={input}
        onClose={() => setAssistantOpen(false)}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onReset={resetChat}
        onOpenGuide={() => {
          setAssistantOpen(false);
          setGuideOpen(true);
        }}
      />
    </>
  );
}
