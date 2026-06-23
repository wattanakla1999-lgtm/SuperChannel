import { Prisma } from "@prisma/client";
import { SegmentCondition } from "../schemas/segment-conditions.schema";
import { SegmentMatch } from "@prisma/client";

export function buildSegmentRawQuery(
  organizationId: string,
  matchType: SegmentMatch,
  conditions: SegmentCondition[]
) {
  if (conditions.length === 0) {
    return {
      query: Prisma.sql`SELECT id FROM customers WHERE organization_id = ${organizationId}::uuid`,
    };
  }

  const sqlConditions: Prisma.Sql[] = [];

  for (const cond of conditions) {
    switch (cond.type) {
      case "customer_labels": {
        const tagIds = cond.value;
        if (cond.operator === "includes_any") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM customer_tags WHERE customer_tags.customer_id = customers.id AND customer_tags.tag_id::text IN (${Prisma.join(tagIds)}))`);
        } else if (cond.operator === "includes_all") {
          sqlConditions.push(Prisma.sql`(SELECT COUNT(DISTINCT tag_id) FROM customer_tags WHERE customer_tags.customer_id = customers.id AND customer_tags.tag_id::text IN (${Prisma.join(tagIds)})) = ${tagIds.length}`);
        } else if (cond.operator === "excludes_any") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM customer_tags WHERE customer_tags.customer_id = customers.id AND customer_tags.tag_id::text IN (${Prisma.join(tagIds)})) = false`);
        } else if (cond.operator === "excludes_all") {
          sqlConditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM customer_tags WHERE customer_tags.customer_id = customers.id AND customer_tags.tag_id::text IN (${Prisma.join(tagIds)}))`);
        }
        break;
      }
      case "channel": {
        const providers = cond.value;
        if (cond.operator === "in") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM customer_channel_identities WHERE customer_channel_identities.customer_id = customers.id AND customer_channel_identities.provider::text IN (${Prisma.join(providers)}))`);
        } else {
          sqlConditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM customer_channel_identities WHERE customer_channel_identities.customer_id = customers.id AND customer_channel_identities.provider::text IN (${Prisma.join(providers)}))`);
        }
        break;
      }
      case "assigned_agent": {
        const hasUnassigned = cond.value.includes("unassigned");
        const agentIds = cond.value.filter((v) => v !== "unassigned");
        
        let agentCondition: Prisma.Sql;
        if (hasUnassigned && agentIds.length > 0) {
          agentCondition = Prisma.sql`(customers.assigned_member_id IS NULL OR customers.assigned_member_id IN (${Prisma.join(agentIds)}))`;
        } else if (hasUnassigned) {
          agentCondition = Prisma.sql`customers.assigned_member_id IS NULL`;
        } else {
          agentCondition = Prisma.sql`customers.assigned_member_id IN (${Prisma.join(agentIds)})`;
        }

        if (cond.operator === "is") {
          sqlConditions.push(agentCondition);
        } else {
          sqlConditions.push(Prisma.sql`NOT (${agentCondition})`);
        }
        break;
      }
      case "marketing_consent": {
        const statuses = cond.value;
        if (cond.operator === "is") {
          sqlConditions.push(Prisma.sql`customers.marketing_consent_status::text IN (${Prisma.join(statuses)})`);
        } else {
          sqlConditions.push(Prisma.sql`customers.marketing_consent_status::text NOT IN (${Prisma.join(statuses)})`);
        }
        break;
      }
      case "total_orders": {
        const op = cond.operator === "gt" ? Prisma.sql`>` : cond.operator === "lt" ? Prisma.sql`<` : Prisma.sql`=`;
        sqlConditions.push(Prisma.sql`(SELECT COUNT(id) FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered')) ${op} ${cond.value}`);
        break;
      }
      case "total_spend": {
        const op = cond.operator === "gt" ? Prisma.sql`>` : cond.operator === "lt" ? Prisma.sql`<` : Prisma.sql`=`;
        sqlConditions.push(Prisma.sql`(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered')) ${op} ${cond.value}`);
        break;
      }
      case "last_purchase": {
        const days = cond.value;
        // days_ago_lt 30 -> purchase was within the last 30 days -> ordered_at >= (NOW() - 30 days)
        // days_ago_gt 30 -> purchase was more than 30 days ago OR no purchase -> ordered_at < (NOW() - 30 days) OR COUNT = 0
        
        if (cond.operator === "days_ago_lt") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered') AND orders.ordered_at >= (NOW() - ${days} * INTERVAL '1 day'))`);
        } else {
          sqlConditions.push(Prisma.sql`(NOT EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered')) OR EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered') AND orders.ordered_at < (NOW() - ${days} * INTERVAL '1 day')))`);
        }
        break;
      }
      case "last_conversation": {
        const days = cond.value;
        if (cond.operator === "days_ago_lt") {
          sqlConditions.push(Prisma.sql`customers.last_interaction_at >= (NOW() - ${days} * INTERVAL '1 day')`);
        } else {
          sqlConditions.push(Prisma.sql`(customers.last_interaction_at IS NULL OR customers.last_interaction_at < (NOW() - ${days} * INTERVAL '1 day'))`);
        }
        break;
      }
    }
  }

  const connector = matchType === "ANY" ? " OR " : " AND ";
  const joinedConditions = Prisma.join(sqlConditions, connector);

  return {
    query: Prisma.sql`SELECT id FROM customers WHERE organization_id = ${organizationId}::uuid AND (${joinedConditions})`,
  };
}
