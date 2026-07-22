import { Resend } from "resend";

export async function sendLiquidityAnnouncement({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#080C14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#E8173A;height:3px;width:60px;border-radius:2px;margin-bottom:24px;"></div>
      <h1 style="color:#ffffff;font-size:28px;font-weight:300;margin:0 0 8px;letter-spacing:-0.5px;">
        LOOP is now tradeable
      </h1>
      <p style="color:#737373;font-size:14px;margin:0;">
        A new chapter for the Loop governance platform
      </p>
    </div>

    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:28px;margin-bottom:24px;">
      <p style="color:#e5e7eb;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi ${displayName},
      </p>
      <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0 0 16px;">
        LOOP tokens are now live on a decentralized exchange with full trading liquidity.
        You can buy, sell, and trade LOOP freely on Base L2.
      </p>
      <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0 0 20px;">
        This means your LOOP tokens now have a real, market-driven price set by supply and demand.
      </p>

      <div style="background:#0a0f1a;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Token</td>
            <td style="color:#ffffff;font-size:14px;text-align:right;padding:6px 0;">LOOP (ERC-20)</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Network</td>
            <td style="color:#ffffff;font-size:14px;text-align:right;padding:6px 0;">Base L2</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Trading pairs</td>
            <td style="color:#ffffff;font-size:14px;text-align:right;padding:6px 0;">LOOP/ETH, LOOP/USDC</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:6px 0;">Contract</td>
            <td style="color:#4ade80;font-size:11px;font-family:monospace;text-align:right;padding:6px 0;">0xb8B3...67F21</td>
          </tr>
        </table>
      </div>

      <h3 style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">What this means for you</h3>
      <ul style="color:#d1d5db;font-size:13px;line-height:1.8;margin:0 0 20px;padding-left:18px;">
        <li>Your LOOP tokens now have market liquidity</li>
        <li>You can trade LOOP on any Base DEX aggregator</li>
        <li>Your governance power and earnings are backed by a tradeable asset</li>
        <li>Card purchases at gov.loopcmbntr.live/buy still work at fixed pricing</li>
      </ul>

      <div style="text-align:center;margin-top:24px;">
        <a href="https://gov.loopcmbntr.live/buy" style="display:inline-block;background:#E8173A;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          Buy LOOP tokens
        </a>
      </div>
      <div style="text-align:center;margin-top:12px;">
        <a href="https://console.loopcmbntr.live" style="color:#4ade80;text-decoration:none;font-size:13px;">
          Go to your console
        </a>
      </div>
    </div>

    <div style="text-align:center;padding-top:16px;border-top:1px solid #1f2937;">
      <p style="color:#4b5563;font-size:11px;margin:0 0 4px;">
        Loop_cmbntr governance platform
      </p>
      <p style="color:#374151;font-size:10px;margin:0;">
        You received this because you are a member of the Loop governance community.
      </p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: "Loop_cmbntr <noreply@loopcmbntr.live>",
    to: email,
    subject: "LOOP is now tradeable on Base L2",
    html,
  });
}

export async function sendBulkLiquidityAnnouncement(
  users: { email: string; displayName: string }[]
) {
  for (const user of users) {
    try {
      await sendLiquidityAnnouncement(user);
      await new Promise((r) => setTimeout(r, 100));
    } catch (e) {
      console.error(`Failed to send to ${user.email}:`, e);
    }
  }
}
