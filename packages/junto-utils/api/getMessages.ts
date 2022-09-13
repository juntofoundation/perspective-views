import { Literal } from "@perspect3vism/ad4m";
import ad4mClient from "./client";
import getMessage from "./getMessage";

export interface Payload {
  perspectiveUuid: string;
  channelId: string;
  from?: Date;
  to?: Date;
}

export default async function ({ perspectiveUuid, channelId, from, to }: Payload) {
  try {
    const expressionLinks = await ad4mClient.perspective.queryProlog(perspectiveUuid, `limit(200, order_by([desc(Timestamp)], flux_message("${channelId}", MessageExpr, Timestamp, Author, Reactions, Replies))).`);
    let cleanedLinks = [];

    //TODO; the below extracting of data from head & tail can likely happen in ad4m-executor, it currently gets returned like this since this is how the node.js swipl wrapper serializes results from swipl
    if (expressionLinks) {
      for (const message of expressionLinks) {
        let reactions = [];
        if (typeof message.Reactions != "string") {
          if (message.Reactions.head) {
            reactions.push({
              "reaction": message.Reactions.head.args[0],
              "timestamp": new Date(message.Reactions.head.args[1].args[0]),
              "author": message.Reactions.head.args[1].args[1],
            });
          }
          let tail = message.Reactions.tail;
          while (typeof tail != "string") {
            reactions.push({
              "reaction": tail.head.args[0],
              "timestamp": new Date(tail.head.args[1].args[0]),
              "author": tail.head.args[1].args[1],
            });
            tail = tail.tail;
          }
        };

        let replies = [];
        if (typeof message.Replies != "string") {
          if (message.Replies.head) {
            replies.push({
              "content": Literal.fromUrl(message.Replies.head.args[0]).get().data,
              "timestamp": new Date(message.Replies.head.args[1].args[0]),
              "author": message.Replies.head.args[1].args[1],
            });
          }
          let tail = message.Replies.tail;
          while (typeof tail != "string") {
            replies.push({
              "content": Literal.fromUrl(tail.head.args[0]).get().data,
              "timestamp": new Date(tail.head.args[1].args[0]),
              "author": tail.head.args[1].args[1],
            });
            tail = tail.tail;
          }
        };

        cleanedLinks.push({
          "id": message.MessageExpr,
          "author": message.Author,
          "content": Literal.fromUrl(message.MessageExpr).get().data,
          "timestamp": new Date(message.Timestamp),
          "reactions": reactions,
          "replies": replies
        });
      }
    };


    const keyedMessages = cleanedLinks.reduce((acc, message) => {
      //@ts-ignore
      return { ...acc, [message.id]: message };
    }, {});

    return {keyedMessages: keyedMessages, expressionLinkLength: expressionLinks.length};
  } catch (e: any) {
    throw new Error(e);
  }
}
