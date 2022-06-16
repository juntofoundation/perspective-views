import { LinkQuery, Link, Ad4mClient } from "@perspect3vism/ad4m";

export interface Payload {
  perspectiveUuid: string;
  languageAddress: string;
  replyUrl: string;
  message: Object;
}

export default async function (ad4mClient: Ad4mClient, {
  perspectiveUuid,
  languageAddress,
  replyUrl,
  message,
}: Payload) {
  try {
    const expUrl = await ad4mClient.expression.create(message, languageAddress);

    await ad4mClient.perspective.addLink(
      perspectiveUuid,
      new Link({
        source: "sioc://chatchannel",
        target: expUrl,
        predicate: "sioc://content_of",
      })
    );

    await ad4mClient.perspective.addLink(
      perspectiveUuid,
      new Link({
        source: expUrl,
        target: replyUrl,
        predicate: "sioc://reply_to",
      })
    );
  } catch (e: any) {
    throw new Error(e);
  }
}
