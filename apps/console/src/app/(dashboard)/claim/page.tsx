import {
  getPurchases,
  getAllocationSlices,
  listDirectableCommunities,
} from "./actions";
import { ClaimPanel } from "./claim-panel";
import { TokenInfoCard } from "./token-info-card";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  const [purchases, slices, communities] = await Promise.all([
    getPurchases(),
    getAllocationSlices(),
    listDirectableCommunities(),
  ]);
  const params = await searchParams;
  const justPurchased = params.purchased === "true";

  const contractAddress = process.env.NEXT_PUBLIC_LOOP_TOKEN_ADDRESS ?? "";
  const chainId = Number(process.env.NEXT_PUBLIC_LOOP_CHAIN_ID ?? 8453);

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
      {contractAddress && (
        <TokenInfoCard contractAddress={contractAddress} chainId={chainId} />
      )}
      <ClaimPanel
        purchases={purchases}
        justPurchased={justPurchased}
        slices={slices}
        communities={communities}
      />
    </div>
  );
}
