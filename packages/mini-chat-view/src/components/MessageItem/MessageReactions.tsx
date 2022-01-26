import { AgentContext } from "junto-utils/react";
import { useContext } from "preact/hooks";
import styles from "./index.scss";

function sortReactions(reactions) {
  const mapped = reactions.reduce((acc: any, reaction: any) => {
    const previous = acc[reaction.data.target] || { authors: [], count: 0 };
    return {
      ...acc,
      [reaction.data.target]: {
        authors: [...previous.authors, reaction.author],
        content: reaction.data.target,
        count: previous.count + 1,
      },
    };
  }, {});
  return Object.values(mapped);
}

export default function MessageReactions({ onEmojiClick, reactions = [] }) {
  const sortedReactions = sortReactions(reactions);

  const { state: agentState } = useContext(AgentContext);

  return (
    <div style={{ display: "flex", gap: "var(--j-space-200)" }}>
      {sortedReactions.map((reaction: any, i) => {
        const activeClass = reaction.authors.find(
          (did) => did === agentState.did
        )
          ? styles.emojiButtonActive
          : "";

        return (
          <button
            class={`${styles.emojiButton} ${activeClass}`}
            onClick={() => onEmojiClick(reaction.content)}
            key={i}
          >
            <span>{reaction.content}</span>
            <span>{reaction.count}</span>
          </button>
        );
      })}
    </div>
  );
}
