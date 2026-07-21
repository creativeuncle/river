import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SmileIcon } from "@hugeicons/core-free-icons";

const CATEGORIES: { label: string; emoji: string[] }[] = [
  {
    label: "Smileys",
    emoji: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰",
      "😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤔","🤨","😐","😑","😶","🙄","😏",
      "😣","😥","😮","🤐","😯","😪","😫","🥱","😴","🤤","😷","🤒","🤕","🤢","🤮","🤧",
      "🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😲","🥺",
      "😦","😧","😨","😰","😥","😢","😭","😱","😖","😞","😓","😩","😫","😤","😡","😠",
      "🤬","😈","👿","💀","☠️","🤡","👻","👽","🤖","💩",
    ],
  },
  {
    label: "Gestures",
    emoji: [
      "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👋","🤚","🖐️","✋","🖖","👏","🙌","🤲",
      "🙏","💪","✍️","🤝","👆","👇","👈","👉","☝️","✊","👊","🤛","🤜","🫶",
    ],
  },
  {
    label: "Hearts",
    emoji: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖",
      "💘","💝","💟",
    ],
  },
  {
    label: "Other",
    emoji: [
      "🔥","✨","🎉","🎊","🎈","🎁","🏆","⭐","🌟","💯","✅","❌","⚡","☕","🍕","🍔",
      "🍰","🎂","🚀","🌈","☀️","🌙","👀","💬","📌","📎","📷","🎧","💡","⏰","📅","✉️",
    ],
  },
];

export function EmojiPicker({ onSelect, disabled }: { onSelect: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="emoji-picker-root" ref={rootRef}>
      <button type="button" className="icon-btn" title="Insert emoji" disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <HugeiconsIcon icon={SmileIcon} size={17} />
      </button>
      {open && (
        <div className="emoji-popover">
          <div className="emoji-popover-tabs">
            {CATEGORIES.map((c, i) => (
              <button
                type="button"
                key={c.label}
                className={`emoji-tab ${i === category ? "active" : ""}`}
                onClick={() => setCategory(i)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {CATEGORIES[category].emoji.map((e) => (
              <button
                type="button"
                key={e}
                className="emoji-cell"
                onClick={() => {
                  onSelect(e);
                  setOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
