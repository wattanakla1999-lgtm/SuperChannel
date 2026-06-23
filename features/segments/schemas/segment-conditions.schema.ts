import { z } from "zod";
import { IntegrationProvider, MarketingConsentStatus, ConversationStatus } from "@prisma/client";

export const CustomerLabelsConditionSchema = z.object({
  type: z.literal("customer_labels"),
  operator: z.enum(["includes_any", "includes_all", "excludes_any", "excludes_all"]),
  value: z.array(z.string().uuid()).min(1),
});

export const ChannelConditionSchema = z.object({
  type: z.literal("channel"),
  operator: z.enum(["has_any", "has_all", "does_not_have"]),
  value: z.array(z.nativeEnum(IntegrationProvider)).min(1),
});

export const AssignedAgentConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("assigned_agent"),
    operator: z.enum(["is", "is_not"]),
    value: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("assigned_agent"),
    operator: z.literal("is_unassigned"),
  }),
]);

export const LatestConversationStatusConditionSchema = z.object({
  type: z.literal("latest_conversation_status"),
  operator: z.enum(["is", "is_not"]),
  value: z.array(z.nativeEnum(ConversationStatus)).min(1),
});

export const LastInteractionConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("last_interaction"),
    operator: z.enum(["days_ago_lt", "days_ago_gt"]),
    value: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("last_interaction"),
    operator: z.enum(["before_date", "after_date"]),
    value: z.string().datetime(), // strictly ISO string UTC
  }),
  z.object({
    type: z.literal("last_interaction"),
    operator: z.literal("never"),
  }),
]);

export const UnreadMessagesConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("unread_messages"),
    operator: z.enum(["gt", "eq"]),
    value: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("unread_messages"),
    operator: z.literal("has_no_unread"),
  }),
]);

export const MarketingConsentConditionSchema = z.object({
  type: z.literal("marketing_consent"),
  operator: z.literal("is"),
  value: z.array(z.nativeEnum(MarketingConsentStatus)).min(1),
});

export const TotalOrdersConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("total_orders"),
    operator: z.enum(["gt", "gte", "eq", "lt", "lte"]),
    value: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("total_orders"),
    operator: z.literal("between"),
    value: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  }),
]);

export const TotalSpendConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("total_spend"),
    operator: z.enum(["gt", "gte", "eq", "lt", "lte"]),
    value: z.number().min(0),
  }),
  z.object({
    type: z.literal("total_spend"),
    operator: z.literal("between"),
    value: z.tuple([z.number().min(0), z.number().min(0)]),
  }),
]);

export const AverageOrderValueConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("average_order_value"),
    operator: z.enum(["gt", "gte", "eq", "lt", "lte"]),
    value: z.number().min(0),
  }),
  z.object({
    type: z.literal("average_order_value"),
    operator: z.literal("between"),
    value: z.tuple([z.number().min(0), z.number().min(0)]),
  }),
]);

export const LastPurchaseConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("last_purchase"),
    operator: z.enum(["days_ago_lt", "days_ago_gt"]),
    value: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("last_purchase"),
    operator: z.enum(["before_date", "after_date"]),
    value: z.string().datetime(),
  }),
  z.object({
    type: z.literal("last_purchase"),
    operator: z.literal("never"),
  }),
]);

export const CustomerCreatedDateConditionSchema = z.discriminatedUnion("operator", [
  z.object({
    type: z.literal("customer_created_date"),
    operator: z.literal("days_ago_lt"),
    value: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("customer_created_date"),
    operator: z.enum(["before_date", "after_date"]),
    value: z.string().datetime(),
  }),
  z.object({
    type: z.literal("customer_created_date"),
    operator: z.literal("between_dates"),
    value: z.tuple([z.string().datetime(), z.string().datetime()]),
  }),
]);

export const SegmentConditionSchema = z.union([
  CustomerLabelsConditionSchema,
  ChannelConditionSchema,
  AssignedAgentConditionSchema,
  LatestConversationStatusConditionSchema,
  LastInteractionConditionSchema,
  UnreadMessagesConditionSchema,
  MarketingConsentConditionSchema,
  TotalOrdersConditionSchema,
  TotalSpendConditionSchema,
  AverageOrderValueConditionSchema,
  LastPurchaseConditionSchema,
  CustomerCreatedDateConditionSchema,
]);

export const SegmentConditionsArraySchema = z.array(SegmentConditionSchema);

export type SegmentCondition = z.infer<typeof SegmentConditionSchema>;
export type CustomerLabelsCondition = z.infer<typeof CustomerLabelsConditionSchema>;
export type ChannelCondition = z.infer<typeof ChannelConditionSchema>;
export type AssignedAgentCondition = z.infer<typeof AssignedAgentConditionSchema>;
export type LatestConversationStatusCondition = z.infer<typeof LatestConversationStatusConditionSchema>;
export type LastInteractionCondition = z.infer<typeof LastInteractionConditionSchema>;
export type UnreadMessagesCondition = z.infer<typeof UnreadMessagesConditionSchema>;
export type MarketingConsentCondition = z.infer<typeof MarketingConsentConditionSchema>;
export type TotalOrdersCondition = z.infer<typeof TotalOrdersConditionSchema>;
export type TotalSpendCondition = z.infer<typeof TotalSpendConditionSchema>;
export type AverageOrderValueCondition = z.infer<typeof AverageOrderValueConditionSchema>;
export type LastPurchaseCondition = z.infer<typeof LastPurchaseConditionSchema>;
export type CustomerCreatedDateCondition = z.infer<typeof CustomerCreatedDateConditionSchema>;
