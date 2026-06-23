import { z } from "zod";
import { IntegrationProvider, MarketingConsentStatus } from "@prisma/client";

export const CustomerLabelsConditionSchema = z.object({
  type: z.literal("customer_labels"),
  operator: z.enum(["includes_any", "includes_all", "excludes_any", "excludes_all"]),
  value: z.array(z.string().uuid()).min(1),
});

export const ChannelConditionSchema = z.object({
  type: z.literal("channel"),
  operator: z.enum(["in", "not_in"]),
  value: z.array(z.nativeEnum(IntegrationProvider)).min(1),
});

export const AssignedAgentConditionSchema = z.object({
  type: z.literal("assigned_agent"),
  operator: z.enum(["is", "is_not"]),
  value: z.array(z.string()).min(1), // can be UUID or "unassigned"
});

export const MarketingConsentConditionSchema = z.object({
  type: z.literal("marketing_consent"),
  operator: z.enum(["is", "is_not"]),
  value: z.array(z.nativeEnum(MarketingConsentStatus)).min(1),
});

export const TotalOrdersConditionSchema = z.object({
  type: z.literal("total_orders"),
  operator: z.enum(["gt", "lt", "eq"]),
  value: z.number().int().min(0),
});

export const TotalSpendConditionSchema = z.object({
  type: z.literal("total_spend"),
  operator: z.enum(["gt", "lt", "eq"]),
  value: z.number().min(0),
});

export const LastPurchaseConditionSchema = z.object({
  type: z.literal("last_purchase"),
  operator: z.enum(["days_ago_lt", "days_ago_gt"]),
  value: z.number().int().min(0),
});

export const LastConversationConditionSchema = z.object({
  type: z.literal("last_conversation"),
  operator: z.enum(["days_ago_lt", "days_ago_gt"]),
  value: z.number().int().min(0),
});

export const SegmentConditionSchema = z.discriminatedUnion("type", [
  CustomerLabelsConditionSchema,
  ChannelConditionSchema,
  AssignedAgentConditionSchema,
  MarketingConsentConditionSchema,
  TotalOrdersConditionSchema,
  TotalSpendConditionSchema,
  LastPurchaseConditionSchema,
  LastConversationConditionSchema,
]);

export const SegmentConditionsArraySchema = z.array(SegmentConditionSchema);

export type SegmentCondition = z.infer<typeof SegmentConditionSchema>;
export type CustomerLabelsCondition = z.infer<typeof CustomerLabelsConditionSchema>;
export type ChannelCondition = z.infer<typeof ChannelConditionSchema>;
export type AssignedAgentCondition = z.infer<typeof AssignedAgentConditionSchema>;
export type MarketingConsentCondition = z.infer<typeof MarketingConsentConditionSchema>;
export type TotalOrdersCondition = z.infer<typeof TotalOrdersConditionSchema>;
export type TotalSpendCondition = z.infer<typeof TotalSpendConditionSchema>;
export type LastPurchaseCondition = z.infer<typeof LastPurchaseConditionSchema>;
export type LastConversationCondition = z.infer<typeof LastConversationConditionSchema>;
