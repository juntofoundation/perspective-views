import ad4mClient from "./client";
import { LinkExpression, LinkQuery } from "@perspect3vism/ad4m";
import { getExpression } from "../helpers/expressionHelpers";
import { Message } from "../types";

export interface Payload {
  neighbourhoodUuid: string;
  link: LinkExpression;
}

export default async function ({ link, neighbourhoodUuid }: Payload) {
  try {
    const expression = await getExpression(link);

    const replyLinks = await ad4mClient.perspective.queryLinks(
      neighbourhoodUuid,
      new LinkQuery({
        source: link.data.target,
        predicate: "sioc://reply_to",
      })
    );

    return {
      id: link.data.target,
      timestamp: expression.timestamp,
      url: link.data.target,
      author: expression.author,
      replyUrl: replyLinks[0] && replyLinks[0]?.data.target,
      content: expression.data.body,
    } as Message;
  } catch (e: any) {
    throw new Error(e);
  }
}
