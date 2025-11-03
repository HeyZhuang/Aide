

import { sendMessages } from '@/api/chat'
import Blur from '@/components/common/Blur'
import { ScrollArea } from '@/components/ui/scroll-area'
import { eventBus, TEvents } from '@/lib/event'
import ChatMagicGenerator from './ChatMagicGenerator'
import {
  AssistantMessage,
  Message,
  Model,
  PendingType,
  Session,
  ToolResultMessage,
} from '@/types/types'
import { useSearch } from '@tanstack/react-router'
import { produce } from 'immer'
import { motion } from 'motion/react'
import { nanoid } from 'nanoid'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { PhotoProvider } from 'react-photo-view'
import { toast } from 'sonner'
import ShinyText from '../ui/shiny-text'
import ChatTextarea from './ChatTextarea'
import MessageRegular from './Message/Regular'
import { ToolCallContent } from './Message/ToolCallContent'
import ToolCallTag from './Message/ToolCallTag'
import SessionSelector from './SessionSelector'
import ChatSpinner from './Spinner'
import ToolcallProgressUpdate from './ToolcallProgressUpdate'
import ShareTemplateDialog from './ShareTemplateDialog'

import { useConfigs } from '@/contexts/configs'
import 'react-photo-view/dist/react-photo-view.css'
import { DEFAULT_SYSTEM_PROMPT } from '@/constants'
import { ModelInfo, ToolInfo } from '@/api/model'
import { Button } from '@/components/ui/button'
import { Share2, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import MixedContent, { MixedContentImages, MixedContentText } from './Message/MixedContent'


type ChatInterfaceProps = {
  canvasId: string
  sessionList: Session[]
  setSessionList: Dispatch<SetStateAction<Session[]>>
  sessionId: string
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  canvasId,
  sessionList,
  setSessionList,
  sessionId: searchSessionId,
  isMinimized = true,
  onToggleMinimize,
}) => {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const { initCanvas, setInitCanvas } = useConfigs()
  const { authStatus } = useAuth()
  const [showShareDialog, setShowShareDialog] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (sessionList.length > 0) {
      let _session = null
      if (searchSessionId) {
        _session = sessionList.find((s) => s.id === searchSessionId) || null
      } else {
        _session = sessionList[0]
      }
      setSession(_session)
    } else {
      setSession(null)
    }
  }, [sessionList, searchSessionId])

  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState<PendingType>(
    initCanvas ? 'text' : false
  )
  const mergedToolCallIds = useRef<string[]>([])

  const sessionId = session?.id ?? searchSessionId

  const sessionIdRef = useRef<string>(session?.id || nanoid())
  const [expandingToolCalls, setExpandingToolCalls] = useState<string[]>([])
  const [pendingToolConfirmations, setPendingToolConfirmations] = useState<
    string[]
  >([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    if (!isAtBottomRef.current) {
      return
    }
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current!.scrollHeight,
        behavior: 'smooth',
      })
    }, 200)
  }, [])

  const mergeToolCallResult = (messages: Message[]) => {
    const messagesWithToolCallResult = messages.map((message, index) => {
      if (message.role === 'assistant' && message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          // From the next message, find the tool call result
          for (let i = index + 1; i < messages.length; i++) {
            const nextMessage = messages[i]
            if (
              nextMessage.role === 'tool' &&
              nextMessage.tool_call_id === toolCall.id
            ) {
              toolCall.result = nextMessage.content
              mergedToolCallIds.current.push(toolCall.id)
            }
          }
        }
      }
      return message
    })

    return messagesWithToolCallResult
  }

  const handleDelta = useCallback(
    (data: TEvents['Socket::Session::Delta']) => {
      if (data.session_id && data.session_id !== sessionId) {
        return
      }

      setPending('text')
      setMessages(
        produce((prev) => {
          const last = prev.at(-1)
          if (
            last?.role === 'assistant' &&
            last.content != null &&
            last.tool_calls == null
          ) {
            if (typeof last.content === 'string') {
              last.content += data.text
            } else if (
              last.content &&
              last.content.at(-1) &&
              last.content.at(-1)!.type === 'text'
            ) {
              ; (last.content.at(-1) as { text: string }).text += data.text
            }
          } else {
            prev.push({
              role: 'assistant',
              content: data.text,
            })
          }
        })
      )
      scrollToBottom()
    },
    [sessionId, scrollToBottom]
  )

  const handleToolCall = useCallback(
    (data: TEvents['Socket::Session::ToolCall']) => {
      if (data.session_id && data.session_id !== sessionId) {
        return
      }

      const existToolCall = messages.find(
        (m) =>
          m.role === 'assistant' &&
          m.tool_calls &&
          m.tool_calls.find((t) => t.id == data.id)
      )

      if (existToolCall) {
        return
      }

      setMessages(
        produce((prev) => {
          console.log('👇tool_call event get', data)
          setPending('tool')
          prev.push({
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                type: 'function',
                function: {
                  name: data.name,
                  arguments: '',
                },
                id: data.id,
              },
            ],
          })
        })
      )

      setExpandingToolCalls(
        produce((prev) => {
          prev.push(data.id)
        })
      )
    },
    [sessionId]
  )

  const handleToolCallPendingConfirmation = useCallback(
    (data: TEvents['Socket::Session::ToolCallPendingConfirmation']) => {
      if (data.session_id && data.session_id !== sessionId) {
        return
      }

      setPendingToolConfirmations((prev) => [...prev, data.id])
    },
    [sessionId]
  )

  const handleToolCallResult = useCallback(
    (data: TEvents['Socket::Session::ToolCallResult']) => {
      if (data.session_id && data.session_id !== sessionId) {
        return
      }

      setPending(false)
      setMessages(
        produce((prev) => {
          prev.push({
            role: 'tool',
            content: data.message.content,
            tool_call_id: data.id,
          } as ToolResultMessage)
        })
      )
      scrollToBottom()
    },
    [sessionId, scrollToBottom]
  )

  useEffect(() => {
    eventBus.on('Socket::Session::Delta', handleDelta)
    eventBus.on('Socket::Session::ToolCall', handleToolCall)
    eventBus.on(
      'Socket::Session::ToolCallPendingConfirmation',
      handleToolCallPendingConfirmation
    )
    eventBus.on('Socket::Session::ToolCallResult', handleToolCallResult)

    return () => {
      eventBus.off('Socket::Session::Delta', handleDelta)
      eventBus.off('Socket::Session::ToolCall', handleToolCall)
      eventBus.off(
        'Socket::Session::ToolCallPendingConfirmation',
        handleToolCallPendingConfirmation
      )
      eventBus.off('Socket::Session::ToolCallResult', handleToolCallResult)
    }
  }, [
    handleDelta,
    handleToolCall,
    handleToolCallPendingConfirmation,
    handleToolCallResult,
  ])

  const onSelectSession = useCallback(
    (id: string) => {
      window.history.pushState({}, '', `/canvas/${canvasId}?sessionId=${id}`)
    },
    [canvasId]
  )

  const onClickNewChat = useCallback(() => {
    const newSession = {
      id: nanoid(),
      title: t('chat:newChat'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      model: session?.model || 'gpt-4o',
      provider: session?.provider || 'openai',
    }

    setSessionList((prev) => [...prev, newSession])
    onSelectSession(newSession.id)
  }, [session, setSessionList, t, onSelectSession])

  const onSendMessages = useCallback(
    (data: Message[], configs: { textModel: Model; toolList: ToolInfo[] }) => {
      setPending('text')
      setMessages(data)

      sendMessages({
        sessionId: sessionId!,
        canvasId: canvasId,
        newMessages: data,
        textModel: configs.textModel,
        toolList: configs.toolList,
        systemPrompt:
          localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT,
      })

      if (searchSessionId !== sessionId) {
        window.history.pushState(
          {},
          '',
          `/canvas/${canvasId}?sessionId=${sessionId}`
        )
      }

      scrollToBottom()
    },
    [canvasId, sessionId, searchSessionId, scrollToBottom]
  )

  const handleCancelChat = useCallback(() => {
    setPending(false)
  }, [])

  // 切换最小化状态
  const toggleMinimize = () => {
    if (onToggleMinimize) {
      onToggleMinimize();
    }
  }

  return (
    <PhotoProvider>
      <div className='flex flex-col h-full relative w-full'>
        {/* Chat header with minimize/close buttons */}
        <div className='bottom-chat-header bg-white/50 backdrop-blur-md border border-white/30' onClick={toggleMinimize}>
          <h3>AI 助手</h3>
          <div className='flex gap-1'>
            <button
              className='bottom-chat-collapse-btn'
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize();
              }}
              title={isMinimized ? '展开' : '收起'}
            >
              {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              className='bottom-chat-collapse-btn'
              onClick={(e) => {
                e.stopPropagation();
                setShowShareDialog(true);
              }}
              title='分享'
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Chat content - only show when not minimized */}
        {!isMinimized && (
          <>
            <ScrollArea className='bottom-chat-messages bg-white/50 backdrop-blur-md border border-white/30' viewportRef={scrollRef}>
              {messages.length > 0 ? (
                <div className='flex flex-col flex-1'>
                  {/* Messages */}
                  {messages.map((message, idx) => (
                    <div key={`${idx}`} className='flex flex-col gap-2 mb-2'>
                      {/* Regular message content */}
                      {typeof message.content == 'string' &&
                        (message.role !== 'tool' ? (
                          <MessageRegular
                            message={message}
                            content={message.content}
                          />
                        ) : message.tool_call_id &&
                          mergedToolCallIds.current.includes(
                            message.tool_call_id
                          ) ? (
                          <></>
                        ) : (
                          <ToolCallContent
                            expandingToolCalls={expandingToolCalls}
                            message={message as ToolResultMessage}
                          />
                        ))}

                      {/* 混合内容消息的文本部分 - 显示在聊天框内 */}
                      {Array.isArray(message.content) && (
                        <>
                          <MixedContentImages
                            contents={message.content}
                          />
                          <MixedContentText
                            message={message}
                            contents={message.content}
                          />
                        </>
                      )}

                      {message.role === 'assistant' &&
                        message.tool_calls &&
                        message.tool_calls.at(-1)?.function.name != 'finish' &&
                        message.tool_calls.map((toolCall, i) => {
                          return (
                            <ToolCallTag
                              key={toolCall.id}
                              toolCall={toolCall}
                              isExpanded={expandingToolCalls.includes(toolCall.id)}
                              onToggleExpand={() => {
                                if (expandingToolCalls.includes(toolCall.id)) {
                                  setExpandingToolCalls((prev) =>
                                    prev.filter((id) => id !== toolCall.id)
                                  )
                                } else {
                                  setExpandingToolCalls((prev) => [
                                    ...prev,
                                    toolCall.id,
                                  ])
                                }
                              }}
                              requiresConfirmation={pendingToolConfirmations.includes(
                                toolCall.id
                              )}
                              onConfirm={() => {
                                // 发送确认事件到后端
                                fetch('/api/tool_confirmation', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    session_id: sessionId,
                                    tool_call_id: toolCall.id,
                                    confirmed: true,
                                  }),
                                })
                              }}
                              onCancel={() => {
                                // 发送取消事件到后端
                                fetch('/api/tool_confirmation', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    session_id: sessionId,
                                    tool_call_id: toolCall.id,
                                    confirmed: false,
                                  }),
                                })
                              }}
                            />
                          )
                        })}
                    </div>
                  ))}
                  {pending && <ChatSpinner pending={pending} />}
                  {pending && sessionId && (
                    <ToolcallProgressUpdate sessionId={sessionId} />
                  )}
                </div>
              ) : (
                <motion.div className='flex flex-col h-full items-start justify-start select-none p-2'>
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className='text-muted-foreground text-base'
                  >
                    <ShinyText text='Hello, Aide!' />
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className='text-muted-foreground text-sm'
                  >
                    <ShinyText text='How can I help you today?' />
                  </motion.span>
                </motion.div>
              )}
            </ScrollArea>

            <div className='bottom-chat-input bg-white/50 backdrop-blur-md border border-white/30 rounded-b-xl'>
              <ChatTextarea
                sessionId={sessionId!}
                pending={!!pending}
                messages={messages}
                onSendMessages={onSendMessages}
                onCancelChat={handleCancelChat}
              />

              {/* 魔法生成组件 */}
              <ChatMagicGenerator
                sessionId={sessionId || ''}
                canvasId={canvasId}
                messages={messages}
                setMessages={setMessages}
                setPending={setPending}
                scrollToBottom={scrollToBottom}
              />
            </div>
          </>
        )}
      </div>

      {/* Share Template Dialog */}
      <ShareTemplateDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        canvasId={canvasId}
        sessionId={sessionId || ''}
        messages={messages}
      />
    </PhotoProvider>
  )
}

export default ChatInterface