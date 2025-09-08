import { PrismaClient, Source } from "@prisma/client";

export type Classification = {
  intent: "TOP_PING" | "MENTION" | "DM" | "OTHER";
  salesSignal: boolean;
  hasMention: boolean;
  isFromTop: boolean;
};

const SALES_RX = /(tender|rfp|proposal|support|incident|sla|downtime|outage|bug|issue)/i;

export async function classifyEvent(prisma: PrismaClient, args: {
  source: Source;
  authorId?: string | null;
  authorName?: string | null;
  text?: string | null;
  mentions?: string[];
  isDM: boolean;
}): Promise<Classification> {
  const isFromTop = await prisma.configTop.findFirst({
    where: {
      source: args.source,
      OR: [
        { identity: { equals: args.authorId ?? "" } },
        { identity: { equals: args.authorName ?? "" } },
      ],
    },
    select: { id: true },
  }).then(Boolean);

  const hasMention = !!(args.mentions && args.mentions.length > 0);
  const salesSignal = !!(args.text && SALES_RX.test(args.text));

  let intent: Classification["intent"] = "OTHER";
  if (isFromTop) intent = "TOP_PING";
  else if (args.isDM) intent = "DM";
  else if (hasMention) intent = "MENTION";

  return { intent, salesSignal, hasMention, isFromTop };
}


