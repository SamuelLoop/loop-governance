export const LOOP_TOKEN_ADDRESS =
  (process.env.NEXT_PUBLIC_LOOP_TOKEN_ADDRESS as `0x${string}`) ??
  ("0xb8B309BBD007143cbef1844b75C1Fd038a267F21" as `0x${string}`);

export const LOOP_TOKEN_ABI = [
  {
    name: "purchase",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "pricePerToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const BASE_CHAIN_ID = 8453;
export const BASE_RPC = "https://mainnet.base.org";
