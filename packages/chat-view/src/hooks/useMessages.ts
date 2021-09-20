import { ref, watch, computed, watchEffect, Ref } from "vue";
import { LinkExpression } from "@perspect3vism/ad4m";
import { Messages, Message } from "../types";
import createMessage from "../api/createMessage";
import subscribeToLinks from "../api/subscribeToLinks";
import { sortExpressionsByTimestamp } from "../helpers/expressionHelpers";
import getMessages from "../api/getMessages";
import createReply from "../api/createReply";
import getMessage from "../api/getMessage";
import createMessageReaction from "../api/createMessageReaction";
import getPerspectiveMeta from "../api/getPerspectiveMeta";
import { SHORT_FORM_EXPRESSION } from "../constants/languages";

export function sortMessages(
  messages: Messages,
  order: "asc" | "desc"
): Message[] {
  return Object.values(messages).sort((a, b) => {
    return order === "asc"
      ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

interface Props {
  perspectiveUuid: any;
  onIncomingMessage: Function;
}

export default function useMessages({
  perspectiveUuid,
  onIncomingMessage = () => null,
}: Props) {
  const fetchingMessages = ref(false);

  const languageAddress = ref("");

  const messages = ref<Messages>({});

  const sortedMessages = computed(() => {
    return sortExpressionsByTimestamp(messages.value, "asc");
  });

  watchEffect(async () => {
    if (perspectiveUuid.value) {
      const meta = await getPerspectiveMeta(perspectiveUuid.value);
      languageAddress.value = meta.languages[SHORT_FORM_EXPRESSION];
    }
  });

  watchEffect(async () => {
    if (perspectiveUuid.value) {
      fetchingMessages.value = true;
      messages.value = await getMessages({
        perspectiveUuid: perspectiveUuid.value,
      });
      fetchingMessages.value = false;

      subscribeToLinks({
        perspectiveUuid: perspectiveUuid.value,
        callback: async (link: LinkExpression) => {
          //  TODO: This needs to be handlet less imperative
          if (
            link.data.source === "sioc://chatchannel" &&
            link.data.predicate === "sioc://content_of" &&
            link.proof.valid
          ) {
            const message = await getMessage({
              link,
              perspectiveUuid: perspectiveUuid.value,
            });

            messages.value = {
              ...messages.value,
              [message.id]: { ...message },
            };
            onIncomingMessage(message);
          }

          if (
            link.data.predicate === "sioc://reaction_to" &&
            link.proof.valid
          ) {
            const id = link.data.source;
            const message = messages.value[id];
            messages.value = {
              ...messages.value,
              [id]: {
                ...message,
                reactions: [
                  ...message.reactions,
                  { content: link.data.target, author: link.author },
                ],
              },
            };
          }
        },
      });
    }
  });

  async function loadMore() {
    fetchingMessages.value = true;
    const oldestMessage = sortedMessages.value[0];
    messages.value = await getMessages({
      perspectiveUuid: perspectiveUuid.value,
      from: new Date(oldestMessage.timestamp),
    });
    fetchingMessages.value = false;
  }

  return {
    fetchingMessages,
    messages,
    sortedMessages,
    createMessage: (message: Object) => {
      return createMessage({
        perspectiveUuid: perspectiveUuid.value,
        languageAddress: languageAddress.value,
        message: { background: [""], body: message },
      });
    },
    createReply: (message: Object, replyUrl: string) => {
      return createReply({
        perspectiveUuid: perspectiveUuid.value,
        languageAddress: languageAddress.value,
        message: { background: [""], body: message },
        replyUrl,
      });
    },
    addReaction: (messageUrl: string, reaction: string) => {
      return createMessageReaction({
        perspectiveUuid: perspectiveUuid.value,
        messageUrl,
        reaction,
      });
    },
    loadMore,
  };
}
