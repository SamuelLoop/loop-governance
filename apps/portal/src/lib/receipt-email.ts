import { Resend } from "resend";

export async function sendPurchaseReceipt({
  email,
  displayName,
  amount,
  impactAmount,
  allocationAmount,
  totalMinted,
  priceFormatted,
  currency,
  date,
  paymentMethod,
}: {
  email: string;
  displayName: string;
  amount: number;
  impactAmount: number;
  allocationAmount: number;
  totalMinted: number;
  priceFormatted: string;
  currency: string;
  date: string;
  paymentMethod: "card" | "crypto";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width:520px; margin:0 auto; padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center; margin-bottom:32px;">
      <img src="https://gov.loopcmbntr.live/logo.png" alt="Loop_cmbntr" width="48" height="48" style="border-radius:10px; margin-bottom:16px;" />
      <h1 style="margin:0; font-size:22px; font-weight:600; color:#fafafa; letter-spacing:-0.02em;">
        Purchase Receipt
      </h1>
      <p style="margin:6px 0 0; font-size:13px; color:#737373;">
        ${date}
      </p>
    </div>

    <!-- Amount card -->
    <div style="background-color:#171717; border:1px solid #262626; border-radius:12px; padding:28px; text-align:center; margin-bottom:20px;">
      <p style="margin:0 0 4px; font-size:13px; color:#a3a3a3;">You purchased</p>
      <p style="margin:0; font-size:36px; font-weight:700; color:#f59e0b; letter-spacing:-0.02em;">
        ${amount.toLocaleString()} LOOP
      </p>
      <p style="margin:8px 0 0; font-size:14px; color:#d4d4d4;">
        for ${priceFormatted} ${currency.toUpperCase()}
      </p>
      <p style="margin:4px 0 0; font-size:11px; color:#737373;">
        via ${paymentMethod === "card" ? "card payment" : "crypto (ETH on Base L2)"}
      </p>
    </div>

    <!-- Breakdown -->
    <div style="background-color:#171717; border:1px solid #262626; border-radius:12px; padding:20px; margin-bottom:20px;">
      <p style="margin:0 0 14px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#737373;">
        Token breakdown
      </p>

      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #262626;">
        <span style="font-size:13px; color:#a3a3a3;">Your tokens</span>
        <span style="font-size:13px; font-weight:600; color:#f59e0b;">${amount.toLocaleString()} LOOP</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #262626;">
        <span style="font-size:13px; color:#a3a3a3;">Impact treasury</span>
        <span style="font-size:13px; font-weight:600; color:#22c55e;">${impactAmount.toLocaleString()} LOOP</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #262626;">
        <span style="font-size:13px; color:#a3a3a3;">Your allocation pot</span>
        <span style="font-size:13px; font-weight:600; color:#3b82f6;">${allocationAmount.toLocaleString()} LOOP</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:10px 0 0;">
        <span style="font-size:13px; font-weight:600; color:#d4d4d4;">Total minted</span>
        <span style="font-size:13px; font-weight:700; color:#fafafa;">${totalMinted.toLocaleString()} LOOP</span>
      </div>
    </div>

    <!-- Next steps -->
    ${paymentMethod === "card" ? `
    <div style="background-color:#172554; border:1px solid #1e3a5f; border-radius:12px; padding:20px; margin-bottom:20px;">
      <p style="margin:0 0 8px; font-size:14px; font-weight:600; color:#93c5fd;">Next step: claim your tokens</p>
      <p style="margin:0 0 14px; font-size:13px; color:#93c5fd; opacity:0.8;">
        Connect your wallet in the console to receive your LOOP tokens on Base L2.
      </p>
      <a href="https://console.loopcmbntr.live/claim" style="display:inline-block; background-color:#3b82f6; color:#ffffff; font-size:13px; font-weight:600; padding:10px 20px; border-radius:8px; text-decoration:none;">
        Claim tokens
      </a>
    </div>
    ` : `
    <div style="background-color:#052e16; border:1px solid #14532d; border-radius:12px; padding:20px; margin-bottom:20px;">
      <p style="margin:0 0 8px; font-size:14px; font-weight:600; color:#86efac;">Tokens delivered</p>
      <p style="margin:0; font-size:13px; color:#86efac; opacity:0.8;">
        Your LOOP tokens have been minted directly to your wallet on Base L2.
      </p>
    </div>
    `}

    <!-- Footer -->
    <div style="text-align:center; padding-top:20px; border-top:1px solid #1a1a1a;">
      <p style="margin:0 0 4px; font-size:11px; color:#525252;">
        LOOP is a utility token on the Loop_cmbntr governance platform.
      </p>
      <p style="margin:0 0 12px; font-size:11px; color:#525252;">
        ERC-20 on Base L2 (Coinbase). Not a security.
      </p>
      <a href="https://gov.loopcmbntr.live" style="font-size:11px; color:#737373; text-decoration:underline;">
        gov.loopcmbntr.live
      </a>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: "Loop_cmbntr <noreply@loopcmbntr.live>",
    to: email,
    subject: `Receipt: ${amount.toLocaleString()} LOOP tokens purchased`,
    html,
  });
}
