import { createToolParameters } from "@goat-sdk/core";
import { z } from "zod";

// Define the missing types
enum QuoteGetSwapModeEnum {
    ExactIn = "ExactIn",
    ExactOut = "ExactOut",
}

interface SwapInfo {
    ammKey: string;
    label?: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
}

interface QuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: QuoteGetSwapModeEnum;
    slippageBps: number;
    computedAutoSlippage?: number;
    platformFee?: {
        amount: string;
        feeBps: number;
    };
    priceImpactPct: string;
    routePlan: {
        swapInfo: SwapInfo;
        percent: number;
    }[];
    contextSlot?: number;
    timeTaken?: number;
}

interface SwapPostRequest {
    swapRequest: {
        userPublicKey: string;
        quoteResponse: QuoteResponse;
    };
}

export class GetQuoteParameters extends createToolParameters(
    z.object({
        inputMint: z.string().describe("The token address of the token to swap from"),
        outputMint: z.string().describe("The token address of the token to swap to"),
        amount: z.number().describe("The amount of tokens to swap in the tokens base unit"),
        slippageBps: z.number().optional().describe("The slippage in bps"),
        autoSlippage: z.boolean().optional().describe("Whether to use auto slippage"),
        autoSlippageCollisionUsdValue: z.number().optional().describe("The collision USD value for auto slippage"),
        computeAutoSlippage: z.boolean().optional().describe("Whether to compute auto slippage"),
        maxAutoSlippageBps: z.number().optional().describe("The maximum auto slippage in bps"),
        swapMode: z.nativeEnum(QuoteGetSwapModeEnum).optional().describe("The swap mode"),
        dexes: z.array(z.string()).optional().describe("The dexes to use"),
        excludeDexes: z.array(z.string()).optional().describe("The dexes to exclude"),
        restrictIntermediateTokens: z.boolean().optional().describe("Whether to restrict intermediate tokens"),
        onlyDirectRoutes: z.boolean().optional().describe("Whether to only use direct routes"),
        asLegacyTransaction: z
            .boolean()
            .optional()
            .describe("Whether to return the transaction as a legacy transaction"),
        platformFeeBps: z.number().optional().describe("The platform fee in bps"),
        maxAccounts: z.number().optional().describe("The maximum number of accounts"),
        minimizeSlippage: z.boolean().optional().describe("Whether to minimize slippage"),
        preferLiquidDexes: z.boolean().optional().describe("Whether to prefer liquid dexes"),
        tokenCategoryBasedIntermediateTokens: z
            .boolean()
            .optional()
            .describe("Whether to use token category based intermediate tokens"),
    }),
) {}

export const swapInfoSchema: z.ZodType<SwapInfo> = z.object({
    ammKey: z.string().describe("The AMM key"),
    label: z.string().optional().describe("The label"),
    inputMint: z.string().describe("The token to swap from"),
    outputMint: z.string().describe("The token to swap to"),
    inAmount: z.string().describe("The amount of tokens to swap"),
    outAmount: z.string().describe("The amount of tokens to swap"),
    feeAmount: z.string().describe("The fee amount"),
    feeMint: z.string().describe("The fee mint"),
});

export const quoteResponseSchema: z.ZodType<QuoteResponse> = z.object({
    inputMint: z.string().describe("The token address of the token to swap from"),
    inAmount: z.string().describe("The amount of tokens to swap in the tokens base unit"),
    outputMint: z.string().describe("The token address of the token to swap to"),
    outAmount: z.string().describe("The amount of tokens to swap in the tokens base unit"),
    otherAmountThreshold: z.string().describe("The amount of tokens to swap in the tokens base unit"),
    swapMode: z.nativeEnum(QuoteGetSwapModeEnum).describe("The swap mode"),
    slippageBps: z.number().describe("The slippage in bps"),
    computedAutoSlippage: z.number().optional().describe("The computed auto slippage"),
    platformFee: z
        .object({
            amount: z.string().describe("The amount of tokens to swap"),
            feeBps: z.number().describe("The platform fee in bps"),
        })
        .optional()
        .describe("The platform fee"),
    priceImpactPct: z.string().describe("The price impact in percentage"),
    routePlan: z
        .array(
            z.object({
                swapInfo: swapInfoSchema.describe("The swap info"),
                percent: z.number().describe("The percent of the route plan step"),
            }),
        )
        .describe("The route plan"),
    contextSlot: z.number().optional().describe("The context slot"),
    timeTaken: z.number().optional().describe("The time taken"),
});

export const swapParametersSchema: z.ZodType<SwapPostRequest> = z.object({
    swapRequest: z.object({
        userPublicKey: z.string().describe("The user public key"),
        quoteResponse: quoteResponseSchema.describe("The quote response"),
    }),
});