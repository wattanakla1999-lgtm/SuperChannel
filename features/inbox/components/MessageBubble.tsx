import { classNames } from "@/lib/class-names";
import { ConversationMessage } from "../types/inbox";
import { formatTimestamp } from "../utils/format";

export default function MessageBubble({ message }: { message: ConversationMessage }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={classNames("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={classNames(
          "max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm",
          isOutbound
            ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
            : "border border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
          <span>{message.senderName}</span>
          <span>{formatTimestamp(message.createdAt)}</span>
        </div>
        {message.type === "image" ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-gradient-to-br from-pink-200 via-orange-100 to-amber-100 p-6 text-sm font-medium text-slate-800">
              Image attachment preview
            </div>
            <p>{message.body}</p>
          </div>
        ) : (
          <p className="text-sm leading-6">{message.body}</p>
        )}
      </div>
    </div>
  );
}