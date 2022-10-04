import ad4mClient from "./client";
import retry from "../helpers/retry";
import { LinkQuery, Link } from "@perspect3vism/ad4m";
import { findLink } from "../helpers/linkHelpers";
import { getMetaFromLinks, keyedLanguages } from "../helpers/languageHelpers";
import { fetch as openFetch } from 'fetch-opengraph';
import getOGData from '../helpers/getOGData'
import { CARD_HIDDEN } from "../constants/ad4m";


export interface Payload {
  perspectiveUuid: string;
  messageUrl: string;
  message: Object;
  isHidden: boolean;
}

export function findNeighbourhood(str: string) {
  const URIregexp = /(?<=\<span data-neighbourhood=""\>)(.|\n)*?(?=<\/span\>)/gm
  const URLregexp = /<a[^>]+href=\"(.*?)\"[^>]*>(.*)?<\/a>/gm
  const uritokens = Array.from(str.matchAll(URIregexp))
  const urlTokens = Array.from(str.matchAll(URLregexp))

  const urifiltered = [];
  const urlfiltered = [];
  
  const urlRex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/
  for (const match of uritokens) {
    if (!urlRex.test(match[0])) {
      urifiltered.push(match[0])
    }
  }
  
  for (const match of urlTokens) {
    urlfiltered.push(match[1])
  }

  return [urifiltered, urlfiltered];
}

export default async function ({
  message,
  isHidden
}: Payload) {
  try {
    // @ts-ignore
    const [neighbourhoods, urls] = findNeighbourhood(message);

    const hoods = []

    if (!isHidden) {
      for (const neighbourhood of neighbourhoods) {
        const exp = await ad4mClient.expression.get(neighbourhood);
        const links = JSON.parse(exp.data).meta.links;

        const perspectives = await ad4mClient.perspective.all();
        const perspectiveUuid = perspectives.find(e => e.sharedUrl === neighbourhood)?.uuid;

        hoods.push({
          type: 'neighbourhood',
          name: links.find(findLink.name).data.target,
          description: links.find(findLink.description).data.target,
          url: neighbourhood || "",
          perspectiveUuid
        })
      }

      // for (const url of urls) {
      //   const response = await fetch(url, {mode: "no-cors"});
      //   const html = await response.text();
      //   console.log('wiw', html)
      //   const data = await getOGData(url, html)

      //   console.log(data)
        
      //   hoods.push({
      //     type: 'link',
      //     name: data.title,
      //     description: data.description,
      //     image: data.image || data.logo,
      //     url
      //   })
      // }
    }

    return hoods;
  } catch (e: any) {
    throw new Error(e);
  }
}



export async function getNeighbourhoodCardHidden({
  perspectiveUuid,
  messageUrl,
}) {
  try {
    const isHidden = await retry(async () => {
      return await ad4mClient.perspective.queryLinks(
        perspectiveUuid,
        new LinkQuery({
          source: messageUrl,
          predicate: CARD_HIDDEN,
        })
    )}, { defaultValue: [] });

    return isHidden.length === 0;
  } catch (e: any) {
    throw new Error(e);
  }
}
