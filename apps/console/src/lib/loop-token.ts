// Server-side LoopTokenV2 client used by the console.
// Reads NEXT_PUBLIC_LOOP_TOKEN_ADDRESS + LOOP_OWNER_PRIVATE_KEY from env.
// The owner key is only used server-side; never expose to the browser.

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

export const LOOP_TOKEN_ABI = [
  {
    type: "function",
    name: "mintForPurchase",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "directAllocationFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "communityId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "transferImpactTreasury",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setCommunityWallet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "communityId", type: "bytes32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "allocationBalance",
    stateMutability: "view",
    inputs: [{ name: "buyer", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "impactTreasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "communityWallets",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

export const LOOP_DECIMALS = 18n;

export function communityIdToBytes32(uuid: string): `0x${string}` {
  // Hash the community UUID to a stable bytes32 id. This is how the app
  // stores community identity on-chain; use the same helper both when
  // registering wallets and when directing allocations.
  return keccak256(toBytes(uuid));
}

export function toTokenUnits(amount: number | bigint): bigint {
  return BigInt(amount) * 10n ** LOOP_DECIMALS;
}

export function fromTokenUnits(amount: bigint): number {
  return Number(amount / 10n ** LOOP_DECIMALS);
}

export function chainConfig(): {
  address: Address;
  chain: typeof base;
  rpc: string;
} {
  const address = process.env.NEXT_PUBLIC_LOOP_TOKEN_ADDRESS as Address | undefined;
  if (!address) {
    throw new Error("NEXT_PUBLIC_LOOP_TOKEN_ADDRESS not set");
  }
  return {
    address,
    chain: base,
    rpc: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicClient(): any {
  const { chain, rpc } = chainConfig();
  return createPublicClient({ chain, transport: http(rpc) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ownerWalletClient(): any {
  const pk = process.env.LOOP_OWNER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    throw new Error("LOOP_OWNER_PRIVATE_KEY not set (server-only secret)");
  }
  const { chain, rpc } = chainConfig();
  const account = privateKeyToAccount(pk);
  return createWalletClient({ account, chain, transport: http(rpc) });
}

async function ownerWrite(
  functionName: "mintForPurchase" | "directAllocationFor" | "transferImpactTreasury" | "setCommunityWallet",
  args: readonly unknown[]
): Promise<Hash> {
  const { address, chain } = chainConfig();
  const wallet = ownerWalletClient();
  const pk = process.env.LOOP_OWNER_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(pk);
  // Pass chain + account explicitly; the ReturnType annotation on
  // ownerWalletClient strips them from the client's inferred type.
  return wallet.writeContract({
    address,
    abi: LOOP_TOKEN_ABI,
    functionName,
    args: args as any,
    account,
    chain,
  });
}

export async function mintForPurchaseOnChain(
  buyer: Address,
  wholeTokenAmount: number
): Promise<Hash> {
  if (wholeTokenAmount <= 0 || wholeTokenAmount % 2 !== 0) {
    throw new Error("Amount must be a positive even integer");
  }
  return ownerWrite("mintForPurchase", [buyer, BigInt(wholeTokenAmount)]);
}

export async function directAllocationForOnChain(
  buyer: Address,
  communityId: `0x${string}`,
  wholeTokenAmount: number
): Promise<Hash> {
  if (wholeTokenAmount <= 0) throw new Error("Amount must be positive");
  return ownerWrite("directAllocationFor", [buyer, communityId, BigInt(wholeTokenAmount)]);
}

export async function transferImpactTreasuryOnChain(
  to: Address,
  wholeTokenAmount: number
): Promise<Hash> {
  if (wholeTokenAmount <= 0) throw new Error("Amount must be positive");
  return ownerWrite("transferImpactTreasury", [to, BigInt(wholeTokenAmount)]);
}

export async function registerCommunityWalletOnChain(
  communityUuid: string,
  wallet: Address
): Promise<Hash> {
  return ownerWrite("setCommunityWallet", [communityIdToBytes32(communityUuid), wallet]);
}

export async function readOnChainAllocationBalance(buyer: Address): Promise<number> {
  const { address } = chainConfig();
  const client = publicClient();
  const bal = (await client.readContract({
    address,
    abi: LOOP_TOKEN_ABI,
    functionName: "allocationBalance",
    args: [buyer],
  })) as bigint;
  return Number(bal);
}

export async function readOnChainBalance(account: Address): Promise<bigint> {
  const { address } = chainConfig();
  const client = publicClient();
  return (await client.readContract({
    address,
    abi: LOOP_TOKEN_ABI,
    functionName: "balanceOf",
    args: [account],
  })) as bigint;
}

export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_LOOP_TOKEN_ADDRESS && process.env.LOOP_OWNER_PRIVATE_KEY);
}
