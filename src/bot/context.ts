import type { Context } from "grammy";

export type BotContext = Context & {
  chatId: number;
};

export function chatIdFrom(ctx: Context): number {
  return ctx.chat?.id ?? 0;
}
