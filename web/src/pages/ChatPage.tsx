import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  downloadEncryptedFile,
  fetchConversationMessages,
  fetchKeyBundle,
  fetchUserByUsername,
  sendMessage,
  uploadEncryptedFile,
  type WireMessage,
} from "../lib/api";
import { decryptFrom, encryptFor } from "../lib/signalClient";
import { decodeEnvelope, encodeEnvelope, type ChatEnvelope } from "../lib/envelope";
import { decryptFile, encryptFile } from "../lib/fileCrypto";
import { useAuth } from "../store/AuthContext";
import { useSocket } from "../store/SocketContext";

interface DisplayMessage {
  id: string;
  fromMe: boolean;
  createdAt: string;
  envelope: ChatEnvelope;
}

function conversationIdFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function ChatPage() {
  const { username } = useParams<{ username: string }>();
  const { session, signalStore } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversationId = useMemo(
    () => (session && otherUserId ? conversationIdFor(session.userId, otherUserId) : null),
    [session, otherUserId]
  );

  const decryptWire = useCallback(
    async (m: WireMessage): Promise<DisplayMessage | null> => {
      if (!signalStore) return null;
      try {
        const plaintext = await decryptFrom(signalStore, m.senderUsername, m.cipherType, m.ciphertext);
        return {
          id: m.id,
          fromMe: m.senderId === session?.userId,
          createdAt: m.createdAt,
          envelope: decodeEnvelope(plaintext),
        };
      } catch (err) {
        console.error("Failed to decrypt message", m.id, err);
        return null;
      }
    },
    [signalStore, session?.userId]
  );

  // Resolve the other user's id so we can compute the (shared) conversation id.
  useEffect(() => {
    if (!session || !username) return;
    setMessages([]);
    setOtherUserId(null);
    fetchUserByUsername(session.token, username)
      .then((r) => setOtherUserId(r.user.id))
      .catch(() => setError("User not found"));
  }, [session, username]);

  // Load and decrypt message history for this conversation.
  useEffect(() => {
    if (!session || !conversationId) return;
    let cancelled = false;
    fetchConversationMessages(session.token, conversationId).then(async (r) => {
      const decrypted = await Promise.all(r.messages.map(decryptWire));
      if (!cancelled) setMessages(decrypted.filter((m): m is DisplayMessage => m !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [session, conversationId, decryptWire]);

  // Live incoming messages over the socket.
  useEffect(() => {
    if (!socket || !username) return;
    const handler = async (m: WireMessage) => {
      if (m.senderUsername !== username) return; // belongs to a different chat
      const decoded = await decryptWire(m);
      if (decoded) setMessages((prev) => [...prev, decoded]);
    };
    socket.on("message", handler);
    return () => {
      socket.off("message", handler);
    };
  }, [socket, username, decryptWire]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendEnvelope(envelope: ChatEnvelope) {
    if (!session || !signalStore || !username) return;
    const plaintext = encodeEnvelope(envelope);
    const { cipherType, ciphertext } = await encryptFor(
      signalStore,
      username,
      () => fetchKeyBundle(session.token, username),
      plaintext
    );
    const { id } = await sendMessage(session.token, username, cipherType, ciphertext);
    setMessages((prev) => [...prev, { id, fromMe: true, createdAt: new Date().toISOString(), envelope }]);
  }

  async function onSendText(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendEnvelope({ kind: "text", text: text.trim() });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session || !conversationId) return;
    setSending(true);
    setError(null);
    try {
      const { blob, key } = await encryptFile(file);
      const { id: fileId } = await uploadEncryptedFile(session.token, conversationId, blob);
      await sendEnvelope({ kind: "file", fileId, name: file.name, mimeType: file.type, size: file.size, key });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send file");
    } finally {
      setSending(false);
    }
  }

  async function onDownload(env: Extract<ChatEnvelope, { kind: "file" }>) {
    if (!session) return;
    try {
      const ciphertext = await downloadEncryptedFile(session.token, env.fileId);
      const plaintext = await decryptFile(ciphertext, env.key);
      const blob = new Blob([plaintext], { type: env.mimeType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = env.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download file");
    }
  }

  if (!session) return null;

  return (
    <div className="chat-page">
      <header>
        <button className="back" onClick={() => navigate("/")}>
          ←
        </button>
        <h2>@{username}</h2>
        <span className="lock" title="End-to-end encrypted">
          🔒
        </span>
      </header>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.fromMe ? "mine" : "theirs"}`}>
            {m.envelope.kind === "text" ? (
              <p>{m.envelope.text}</p>
            ) : (
              <button className="file-chip" onClick={() => onDownload(m.envelope as Extract<ChatEnvelope, { kind: "file" }>)}>
                📎 {m.envelope.name} · {(m.envelope.size / 1024).toFixed(0)} KB
              </button>
            )}
            <time>{new Date(m.createdAt).toLocaleTimeString()}</time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error">{error}</p>}

      <form className="composer" onSubmit={onSendText}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={onPickFile}
          accept="image/*,video/*,.zip,.pdf,.psd,.ai,.eps,.svg"
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending}>
          📎
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
