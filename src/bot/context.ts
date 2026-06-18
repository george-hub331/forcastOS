import type { Context } from "grammy";

export function chatIdFrom(ctx: Context): number {
  return ctx.chat?.id ?? 0;
}
