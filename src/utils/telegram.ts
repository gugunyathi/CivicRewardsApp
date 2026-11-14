// Telegram Mini App detection for @civicrewardsbot. Mirrors the multi-
// channel start_param/initData resolution in signal-desk-v4's live Ward 115
// Mini App (app/ward-report/page.tsx) — Telegram delivers these inconsistently
// across clients (confirmed there via real debug-strip evidence from
// Telegram Web on macOS), so every channel is checked, first non-empty wins.

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready(): void;
        expand(): void;
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
          user?: { id?: number; first_name?: string; last_name?: string; username?: string };
        };
      };
    };
  }
}

export type TelegramContext = {
  isTelegram: boolean;
  initData: string;
  startParam: string;
  userId: number | null;
  firstName: string | null;
};

function parseTgWebAppDataFromHash(hash: string): string | null {
  if (!hash || hash.indexOf('tgWebAppData=') === -1) return null;
  return new URLSearchParams(hash.replace(/^#/, '')).get('tgWebAppData');
}

export function getTelegramContext(): TelegramContext {
  const tg = window.Telegram?.WebApp;
  const isTelegram = !!tg;

  let initData = tg?.initData ?? '';
  let startParam = tg?.initDataUnsafe?.start_param ?? '';

  if (!startParam) {
    const qp = new URLSearchParams(window.location.search).get('tgWebAppStartParam');
    if (qp) startParam = qp;
  }

  if (!initData || !startParam) {
    const liveHash = window.location.hash ?? '';
    let hashToUse = parseTgWebAppDataFromHash(liveHash) ? liveHash : '';
    if (!hashToUse) {
      try {
        const backup = sessionStorage.getItem('civic_tg_hash_backup') ?? '';
        if (parseTgWebAppDataFromHash(backup)) hashToUse = backup;
      } catch {
        // sessionStorage unavailable — channel C empty
      }
    }
    const tgWebAppData = parseTgWebAppDataFromHash(hashToUse);
    if (tgWebAppData) {
      if (!initData) initData = tgWebAppData;
      if (!startParam) startParam = new URLSearchParams(tgWebAppData).get('start_param') ?? '';
    }
  }

  if (tg) {
    tg.ready();
    tg.expand();
  }

  return {
    isTelegram,
    initData,
    startParam,
    userId: tg?.initDataUnsafe?.user?.id ?? null,
    firstName: tg?.initDataUnsafe?.user?.first_name ?? null,
  };
}

// Stable per-launch actor id for the civic API's x-civic-actor-id — Telegram
// user id when launched from Telegram, otherwise null (caller falls back to
// the web session id).
export function telegramActorId(ctx: TelegramContext): string | null {
  return ctx.userId ? `telegram:${ctx.userId}` : null;
}
