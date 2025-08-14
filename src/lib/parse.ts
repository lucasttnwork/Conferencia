export function parseBrMoney(input?: string | null): number | null {
  if (!input) return null;
  const s = String(input).trim().replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function parseBrDate(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi] = m;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, h ? +h : 0, mi ? +mi : 0));
    return dt.toISOString();
  }
  const dt = new Date(s);
  return Number.isFinite(dt.valueOf()) ? dt.toISOString() : null;
}

export function pickLine(desc: string, labelRe: RegExp): string | null {
  const m = desc.match(labelRe);
  return m ? m[1].trim() : null;
}

export function extractFromDescription(description: string) {
  const receivedText = pickLine(description, /^\s*📆\s*Recebido\s*em\s*:\s*(.+)$/mi);
  const clerkName    = pickLine(description, /^\s*👤\s*Escrevente\s*:\s*(.+)$/mi);
  const actType      = pickLine(description, /^\s*💼\s*Natureza\s*:\s*(.+)$/mi);
  const valueText    = pickLine(description, /^\s*💰\s*Valor\s*:\s*(.+)$/mi);
  const email        = pickLine(description, /^\s*📧\s*E-mail\s*:\s*(.+)$/mi);
  const reconfText   = pickLine(description, /^\s*Reconferência\s*:\s*(.+)$/mi);

  const received_at = parseBrDate(receivedText);
  const act_value   = parseBrMoney(valueText);
  const reconference = reconfText
    ? /sim/i.test(reconfText) ? true : (/nao|não/i.test(reconfText) ? false : null)
    : null;

  return {
    received_at,
    received_at_text: receivedText ?? null,
    clerk_name: clerkName ?? null,
    act_type: actType ?? null,
    act_value,
    act_value_text: valueText ?? null,
    clerk_email: email ?? null,
    reconference,
  };
}

export function extractProtocolNumber(name?: string | null): string | null {
  if (!name) return null;
  const m = name.match(/(\d{6,})/);
  return m ? m[1] : null;
} 