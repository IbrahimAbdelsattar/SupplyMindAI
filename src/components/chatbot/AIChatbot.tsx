import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { copilotChat } from '@/lib/knowledgeApi';
import { FormattedMessage } from '../ai/FormattedMessage';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickQuestions = [
  'How accurate are the demand forecasts?',
  'What factors affect inventory levels?',
  'Explain the MLOps monitoring system',
  'How do I interpret the dashboard KPIs?',
];

export const AIChatbot = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '', // Will be dynamically translated on render via t('chatbot:welcome')
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const question = input.trim();
    const userMessage: Message = {
      id: messages.length,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await copilotChat({ message: question });
      const assistantMessage: Message = {
        id: messages.length + 1,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: Message = {
        id: messages.length + 1,
        role: 'assistant',
        content: t('chatbot:error'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 rtl:right-auto rtl:left-4 sm:bottom-6 sm:right-6 rtl:sm:right-auto rtl:sm:left-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-50',
          'hover:scale-110 transition-transform duration-200',
          isOpen && 'hidden'
        )}
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="absolute -top-1 -right-1 rtl:right-auto rtl:-left-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
          <Sparkles className="w-3 h-3" />
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 rtl:sm:right-auto rtl:sm:left-6 sm:w-96 sm:h-[600px] bg-card border-0 sm:border sm:border-border sm:rounded-2xl flex flex-col overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('chatbot:header.title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('chatbot:header.subtitle')}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent/10 text-accent'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] p-3 rounded-2xl text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm rtl:rounded-tl-sm rtl:rounded-tr-none'
                        : 'bg-muted rounded-tl-sm rtl:rounded-tr-sm rtl:rounded-tl-none'
                    )}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-line">{message.content}</p>
                    ) : (
                      <FormattedMessage content={message.id === 0 ? t('chatbot:welcome') : message.content} />
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-sm rtl:rounded-tr-sm rtl:rounded-tl-none">
                    <span className="text-xs text-muted-foreground block mb-1">{t('chatbot:thinking')}</span>
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">{t('chatbot:quickQuestions')}</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(t('chatbot:quickQuestionsList', { returnObjects: true })) 
                    ? t('chatbot:quickQuestionsList', { returnObjects: true }) as string[] 
                    : quickQuestions
                  ).map((question) => (
                    <button
                      key={question}
                      onClick={() => handleQuickQuestion(question)}
                      className="px-3 py-1.5 text-xs rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border bg-card safe-area-bottom">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chatbot:placeholder')}
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
