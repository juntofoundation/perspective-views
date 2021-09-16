import ad4mClient from "./client";
import { LinkQuery } from "@perspect3vism/ad4m";
import { keyedExpressions } from "../helpers/expressionHelpers";
import getMessage from "./getMessage";

export interface Payload {
  neighbourhoodUuid: string;
  from?: Date;
  to?: Date;
}

export default async function ({ neighbourhoodUuid, from, to }: Payload) {
  try {
    const expressionLinks = await ad4mClient.perspective.queryLinks(
      neighbourhoodUuid,
      new LinkQuery({
        source: "sioc://chatchannel",
        predicate: "sioc://content_of",
        fromDate: from || new Date("1/12/10"),
        untilDate: to || new Date(),
      })
    );

    const linkPromises = expressionLinks.map((link) =>
      getMessage({ link, neighbourhoodUuid })
    );

    const messages = await Promise.all(linkPromises);

    return messages.reduce((acc, message) => {
      return { ...acc, [message.id]: message };
    }, {});
  } catch (e: any) {
    throw new Error(e);
  }
}
