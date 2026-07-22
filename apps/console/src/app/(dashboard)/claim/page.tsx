import { getPurchases } from "./actions";
import { ClaimPanel } from "./claim-panel";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  const purchases = await getPurchases();
  const params = await searchParams;
  const justPurchased = params.purchased === "true";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Tokens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every LOOP token you have purchased is tracked here. Card purchases
          are held securely until you connect a wallet. Crypto purchases are
          confirmed on-chain instantly.
        </p>
      </div>
      <ClaimPanel purchases={purchases} justPurchased={justPurchased} />
    </div>
  );
}
