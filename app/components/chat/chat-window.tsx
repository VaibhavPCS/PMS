import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Bold, Italic, Underline, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Socket } from 'socket.io-client';
import MessageItem from './message-item';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

interface Chat {
  _id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      profilePicture?: string;
    };
    role: 'admin' | 'member';
    joinedAt: string;
  }>;
  workspace?: {
    _id: string;
    name: string;
  };
}

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  chat: string;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
    };
  };
  attachments: Array<{
    fileName: string;
    originalName?: string;
    fileUrl: string;
    fileType: 'image' | 'document';
    fileSize: number;
    mimeType: string;
  }>;
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  isEdited: boolean;
  editedAt?: string;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUser: User;
  onSendMessage: (content: string, attachments?: File[], replyTo?: string) => void;
  socket: Socket | null;
  onBack?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

// Helper function to strip HTML tags and get plain text
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  currentUser,
  onSendMessage,
  socket,
  onBack,
  isUploading = false,
  uploadProgress = 0
}) => {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasContent, setHasContent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512 MB
  const MAX_MESSAGE_LENGTH = 5000;
  const [characterCount, setCharacterCount] = useState(0);

  // TipTap Editor Configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable unnecessary extensions
        heading: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      // UnderlineExtension, // Removed to fix duplicate extension warning
      Placeholder.configure({
        placeholder: 'Write your message here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[20px] max-h-[120px] overflow-y-auto text-[13px] sm:text-[14px] text-neutral-700 leading-[1.5]',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          handleSendMessage();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      handleTyping(text);
      setHasContent(!!text.trim() || selectedFiles.length > 0);
      setCharacterCount(text.trim().length);
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setHasContent(!!(editor?.getText().trim()) || selectedFiles.length > 0);
  }, [selectedFiles, editor]);

  useEffect(() => {
    if (socket) {
      socket.on('typing', (data: { userId: string; userName: string; chatId: string }) => {
        if (data.chatId === chat._id && data.userId !== currentUser._id) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userName]);
        }
      });

      socket.on('stopTyping', (data: { userId: string; chatId: string }) => {
        if (data.chatId === chat._id) {
          setTypingUsers(prev => prev.filter(name => name !== data.userId));
        }
      });

      socket.on('new-message', (data: { message: Message; chatId: string; senderId: string }) => {
        if (data.chatId === chat._id && data.senderId !== currentUser._id) {
          // Add the new message to the messages array
          // This will trigger a re-render and show the new message
          // The parent component should handle the actual state update
          // For now, we'll trigger a custom event that the parent can listen to
          window.dispatchEvent(new CustomEvent('chat:new-message', { detail: data }));
        }
      });

      return () => {
        socket.off('typing');
        socket.off('stopTyping');
        socket.off('new-message');
      };
    }
  }, [socket, chat._id, currentUser._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = () => {
    if (chat.name) return chat.name;
    return chat.participants
      .filter(p => p.user._id !== currentUser._id)
      .map(p => p.user.name)
      .join(', ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getChatAvatar = () => {
    if (chat.type === 'group') {
      return (
        <div className="w-[28px] h-[28px] sm:w-[35px] sm:h-[35px] rounded-[20px] bg-gradient-to-b from-[#344bfd] to-[#4a8cd7] flex items-center justify-center shrink-0">
          <p className="font-['Inter'] font-medium text-[12px] sm:text-[16px] text-white leading-none">
            {getInitials(getChatName())}
          </p>
        </div>
      );
    }

    const otherParticipant = chat.participants.find(p => p.user._id !== currentUser._id);
    if (otherParticipant) {
      return (
        <Avatar className="w-[28px] h-[28px] sm:w-[35px] sm:h-[35px] rounded-[20px] shrink-0">
          {otherParticipant.user.profilePicture && (
            <img
              src={otherParticipant.user.profilePicture}
              alt={otherParticipant.user.name}
              className="rounded-[20px] object-cover"
            />
          )}
          <AvatarFallback className="bg-gradient-to-b from-[#344bfd] to-[#4a8cd7] text-white text-[12px] sm:text-[16px] font-medium rounded-[20px]">
            {getInitials(otherParticipant.user.name)}
          </AvatarFallback>
        </Avatar>
      );
    }

    return null;
  };

  const getMemberCount = () => {
    if (chat.type === 'group') {
      return `${chat.participants.length} Members`;
    }
    return null;
  };

  const handleSendMessage = useCallback(() => {
    if (!editor) return;

    const htmlContent = editor.getHTML();
    const textContent = editor.getText().trim();

    if (!textContent && selectedFiles.length === 0) {
      return;
    }

    // Validate message length
    if (textContent.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH.toLocaleString()} characters allowed. Current: ${textContent.length.toLocaleString()} characters.`);
      return;
    }

    // Use HTML content if there's formatting, otherwise use plain text
    const content = textContent ? htmlContent : 'File attachment';
    onSendMessage(content, selectedFiles.length ? selectedFiles : undefined, replyTo?._id);

    // Clear editor and state
    editor.commands.clearContent();
    setSelectedFiles([]);
    setReplyTo(null);
    setCharacterCount(0);

    if (socket) {
      socket.emit('stopTyping', { chatId: chat._id });
    }
  }, [editor, selectedFiles, replyTo, onSendMessage, socket, chat._id, MAX_MESSAGE_LENGTH]);

  const handleTyping = (value: string) => {
    if (socket) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        socket.emit('typing', { chatId: chat._id });

        setTimeout(() => {
          setIsTyping(false);
          socket.emit('stopTyping', { chatId: chat._id });
        }, 3000);
      } else if (!value.trim() && isTyping) {
        setIsTyping(false);
        socket.emit('stopTyping', { chatId: chat._id });
      }
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const rejectedNames: string[] = [];
    files.forEach((file) => {
      if (file.size <= MAX_FILE_SIZE) {
        validFiles.push(file);
      } else {
        rejectedNames.push(file.name);
      }
    });

    if (rejectedNames.length) {
      toast.error(`File size exceeds 512 MB`, { description: rejectedNames.join(', ') });
    }

    if (validFiles.length) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    e.target.value = '';
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    editor?.commands.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l-[0.5px] border-r-[0.5px] border-[#e4e9ea] relative">
      {/* Header */}
      <div className="flex items-start gap-[8px] px-[10px] sm:px-[15px] md:px-[20px] py-[10px] border-b border-[#e4e9ea] shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0 md:hidden mr-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        {getChatAvatar()}
        <div className="flex flex-col gap-[5px] justify-center flex-1 min-w-0">
          <p className="font-['Inter'] font-medium text-[14px] sm:text-[16px] text-neutral-700 leading-normal truncate">
            {getChatName()}
          </p>
          {getMemberCount() && (
            <p className="font-['Inter'] font-normal text-[11px] sm:text-[12px] text-[#717182] leading-normal">
              {getMemberCount()}
            </p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 bg-white flex gap-[15px] overflow-hidden">
        <ScrollArea className="flex-1 px-[10px] sm:px-[15px] md:px-[25px] py-[15px] sm:py-[20px]">
          <div className="flex flex-col gap-[20px] sm:gap-[25px] w-full max-w-[900px] lg:max-w-[1200px] xl:max-w-[1400px] mx-auto">
            {messages.map((message, index) => {
              const showAvatar = index === 0 ||
                messages[index - 1].sender._id !== message.sender._id ||
                new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000;

              return (
                <MessageItem
                  key={message._id}
                  message={message}
                  currentUser={currentUser}
                  showAvatar={showAvatar}
                  onReply={handleReply}
                  socket={socket}
                />
              );
            })}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 pl-[35px]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>


      </div>

      {/* Message Composer - Responsive Design */}
      <div className="bg-white rounded-lg border border-[#cccccc] mx-[8px] sm:mx-[12px] md:mx-[16px] mb-[8px] sm:mb-[12px] md:mb-[16px] shrink-0">
        {/* Reply Preview - Temporarily commented out
        {replyTo && (
          <div className="px-[10px] sm:px-[12px] pt-[8px] sm:pt-[10px] pb-[6px] sm:pb-[8px] border-b border-neutral-100 overflow-hidden">
            <div className="flex items-start justify-between gap-2 bg-[#f1f2f7] rounded-[6px] px-[8px] sm:px-[10px] py-[6px] sm:py-[8px] overflow-hidden">
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-[10px] sm:text-[11px] text-[#717182] font-['Inter'] font-medium">
                  Replying to {replyTo.sender.name}
                </p>
                <p className="text-[11px] sm:text-[12px] text-neutral-700 font-['Inter'] mt-[2px] truncate">
                  {stripHtmlTags(replyTo.content)}
                </p>
              </div>
              <button
                onClick={cancelReply}
                className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
              >
                ×
              </button>
            </div>
          </div>
        )}
        */}

        {/* Rich Text Editor Area */}
        <div className="p-[8px] sm:p-[10px] md:p-[12px] pb-0">
          <div className="w-full min-h-[50px] sm:min-h-[60px] md:min-h-[64px] max-h-[100px] sm:max-h-[110px] md:max-h-[120px] overflow-y-auto">
            <EditorContent
              editor={editor}
              className="w-full [&_.ProseMirror]:min-h-[40px] [&_.ProseMirror]:text-[12px] [&_.ProseMirror]:sm:text-[13px] [&_.ProseMirror]:md:text-[14px] [&_.ProseMirror]:text-neutral-700 [&_.ProseMirror]:leading-[1.5] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#a1a1a1] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
            />
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mt-[8px] sm:mt-[10px]">
              <div className="flex flex-wrap gap-[6px] sm:gap-[8px]">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-[4px] sm:gap-[6px] px-[8px] sm:px-[10px] py-[4px] sm:py-[6px] rounded-[6px] bg-[#f1f2f7] border border-[#e4e9ea]"
                  >
                    <span className="text-[10px] sm:text-[11px] md:text-[12px] text-neutral-700 font-['Inter'] truncate max-w-[80px] sm:max-w-[120px] md:max-w-[180px]">
                      {file.name}
                    </span>
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-gray-600 text-[12px] sm:text-[14px]"
                      disabled={isUploading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="mt-[8px] sm:mt-[10px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] text-gray-600 font-['Inter']">
                      Uploading files...
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-gray-600 font-['Inter'] font-medium">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-[4px] overflow-hidden">
                    <div
                      className="bg-[#FF6B2C] h-full transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-[1px] bg-[#cccccc] w-full"></div>

        {/* Bottom Toolbar - Fully Responsive */}
        <div className="flex items-center gap-[8px] sm:gap-[10px] md:gap-[12px] px-[8px] sm:px-[12px] md:px-[16px] py-[6px] sm:py-[8px] md:py-[10px]">
          {/* Formatting Buttons Group */}
          <div className="flex items-center gap-[4px] sm:gap-[6px] md:gap-[8px]">
            {/* Bold Button */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              aria-pressed={editor?.isActive('bold')}
              className={cn(
                "p-[4px] sm:p-[5px] md:p-[6px] rounded-md hover:bg-gray-100 transition-colors",
                editor?.isActive('bold') ? "bg-gray-200 text-gray-900" : "text-gray-600"
              )}
              title="Bold"
            >
              <Bold className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px]" />
            </button>

            {/* Italic Button */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              aria-pressed={editor?.isActive('italic')}
              className={cn(
                "p-[4px] sm:p-[5px] md:p-[6px] rounded-md hover:bg-gray-100 transition-colors",
                editor?.isActive('italic') ? "bg-gray-200 text-gray-900" : "text-gray-600"
              )}
              title="Italic"
            >
              <Italic className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px]" />
            </button>

            {/* Underline Button */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              aria-pressed={editor?.isActive('underline')}
              className={cn(
                "p-[4px] sm:p-[5px] md:p-[6px] rounded-md hover:bg-gray-100 transition-colors",
                editor?.isActive('underline') ? "bg-gray-200 text-gray-900" : "text-gray-600"
              )}
              title="Underline"
            >
              <Underline className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px]" />
            </button>
          </div>

          {/* Attach Button */}
          <label
            htmlFor="chat-attach"
            className="cursor-pointer p-[4px] sm:p-[5px] md:p-[6px] rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]">
              <path d="M17.8668 9.29175L10.2001 16.9584C8.78346 18.3751 6.46679 18.3751 5.05012 16.9584C3.63346 15.5417 3.63346 13.2251 5.05012 11.8084L12.7168 4.14175C13.6418 3.21675 15.1418 3.21675 16.0668 4.14175C16.9918 5.06675 16.9918 6.56675 16.0668 7.49175L8.40846 15.1501C7.94596 15.6126 7.19596 15.6126 6.73346 15.1501C6.27096 14.6876 6.27096 13.9376 6.73346 13.4751L13.5585 6.66675" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              id="chat-attach"
              ref={fileInputRef}
              multiple
              accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.txt,.apk"
              className="hidden"
              type="file"
              onChange={handleFileChange}
            />
          </label>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Character Counter - Shows when approaching limit */}
          {characterCount > MAX_MESSAGE_LENGTH * 0.8 && (
            <div className={cn(
              "text-[10px] sm:text-[11px] font-['Inter'] shrink-0",
              characterCount > MAX_MESSAGE_LENGTH
                ? "text-red-500 font-semibold"
                : characterCount > MAX_MESSAGE_LENGTH * 0.9
                  ? "text-orange-500 font-medium"
                  : "text-gray-500"
            )}>
              {characterCount.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
            </div>
          )}

          {/* Send Button - Responsive */}
          <button
            onClick={handleSendMessage}
            disabled={!hasContent || isUploading}
            className={cn(
              "flex items-center justify-center gap-[4px] sm:gap-[6px] md:gap-[8px] px-[10px] sm:px-[14px] md:px-[18px] py-[6px] sm:py-[7px] md:py-[8px] rounded-md transition-all shrink-0",
              hasContent && !isUploading
                ? "bg-[#FF6B2C] hover:bg-[#FF5A1A] cursor-pointer"
                : "bg-gray-300 cursor-not-allowed opacity-50"
            )}
          >
            {isUploading ? (
              <>
                <div className="w-[12px] h-[12px] sm:w-[13px] sm:h-[13px] md:w-[14px] md:h-[14px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="font-['Inter'] font-medium text-[11px] sm:text-[12px] md:text-[13px] text-white leading-normal">
                  {uploadProgress}%
                </span>
              </>
            ) : (
              <>
                <Send className="w-[12px] h-[12px] sm:w-[13px] sm:h-[13px] md:w-[14px] md:h-[14px] text-white" />
                <span className="font-['Inter'] font-medium text-[11px] sm:text-[12px] md:text-[13px] text-white leading-normal">
                  Send
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt,.apk"
      />
    </div>
  );
};

export default ChatWindow;
