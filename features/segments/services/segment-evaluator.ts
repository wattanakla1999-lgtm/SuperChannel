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
        const lowerProviders = providers.map(p => p.toLowerCase());
        if (cond.operator === "has_any") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM customer_channel_identities WHERE customer_channel_identities.customer_id = customers.id AND customer_channel_identities.channel::text IN (${Prisma.join(lowerProviders)}))`);
        } else if (cond.operator === "has_all") {
          sqlConditions.push(Prisma.sql`(SELECT COUNT(DISTINCT channel) FROM customer_channel_identities WHERE customer_channel_identities.customer_id = customers.id AND customer_channel_identities.channel::text IN (${Prisma.join(lowerProviders)})) = ${providers.length}`);
        } else if (cond.operator === "does_not_have") {
          sqlConditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM customer_channel_identities WHERE customer_channel_identities.customer_id = customers.id AND customer_channel_identities.channel::text IN (${Prisma.join(lowerProviders)}))`);
        }
        break;
      }
      case "assigned_agent": {
        if (cond.operator === "is_unassigned") {
          sqlConditions.push(Prisma.sql`customers.assigned_member_id IS NULL`);
        } else {
          const agentIds = cond.value;
          if (cond.operator === "is") {
            sqlConditions.push(Prisma.sql`customers.assigned_member_id::text IN (${Prisma.join(agentIds)})`);
          } else if (cond.operator === "is_not") {
            sqlConditions.push(Prisma.sql`(customers.assigned_member_id IS NULL OR customers.assigned_member_id::text NOT IN (${Prisma.join(agentIds)}))`);
          }
        }
        break;
      }
      case "latest_conversation_status": {
        const statuses = cond.value;
        if (cond.operator === "is") {
          sqlConditions.push(Prisma.sql`customers.status::text IN (${Prisma.join(statuses)})`);
        } else if (cond.operator === "is_not") {
          sqlConditions.push(Prisma.sql`customers.status::text NOT IN (${Prisma.join(statuses)})`);
        }
        break;
      }
      case "last_interaction": {
        if (cond.operator === "never") {
          sqlConditions.push(Prisma.sql`customers.last_interaction_at IS NULL`);
        } else if (cond.operator === "days_ago_lt") {
          sqlConditions.push(Prisma.sql`customers.last_interaction_at >= (NOW() - ${cond.value} * INTERVAL '1 day')`);
        } else if (cond.operator === "days_ago_gt") {
          sqlConditions.push(Prisma.sql`(customers.last_interaction_at IS NOT NULL AND customers.last_interaction_at < (NOW() - ${cond.value} * INTERVAL '1 day'))`);
        } else if (cond.operator === "before_date") {
          sqlConditions.push(Prisma.sql`customers.last_interaction_at < ${cond.value}::timestamp`);
        } else if (cond.operator === "after_date") {
          sqlConditions.push(Prisma.sql`customers.last_interaction_at > ${cond.value}::timestamp`);
        }
        break;
      }
      case "unread_messages": {
        if (cond.operator === "has_no_unread") {
          sqlConditions.push(Prisma.sql`customers.unread_count = 0`);
        } else if (cond.operator === "gt") {
          sqlConditions.push(Prisma.sql`customers.unread_count > ${cond.value}`);
        } else if (cond.operator === "eq") {
          sqlConditions.push(Prisma.sql`customers.unread_count = ${cond.value}`);
        }
        break;
      }
      case "marketing_consent": {
        const statuses = cond.value;
        sqlConditions.push(Prisma.sql`customers.marketing_consent_status::text IN (${Prisma.join(statuses)})`);
        break;
      }
      case "total_orders": {
        const subquery = Prisma.sql`(SELECT COUNT(id) FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered'))`;
        if (cond.operator === "between") {
          sqlConditions.push(Prisma.sql`${subquery} BETWEEN ${cond.value[0]} AND ${cond.value[1]}`);
        } else {
          const op = cond.operator === "gt" ? Prisma.sql`>` : cond.operator === "gte" ? Prisma.sql`>=` : cond.operator === "lt" ? Prisma.sql`<` : cond.operator === "lte" ? Prisma.sql`<=` : Prisma.sql`=`;
          sqlConditions.push(Prisma.sql`${subquery} ${op} ${cond.value}`);
        }
        break;
      }
      case "total_spend": {
        const subquery = Prisma.sql`(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered'))`;
        if (cond.operator === "between") {
          sqlConditions.push(Prisma.sql`${subquery} BETWEEN ${cond.value[0]} AND ${cond.value[1]}`);
        } else {
          const op = cond.operator === "gt" ? Prisma.sql`>` : cond.operator === "gte" ? Prisma.sql`>=` : cond.operator === "lt" ? Prisma.sql`<` : cond.operator === "lte" ? Prisma.sql`<=` : Prisma.sql`=`;
          sqlConditions.push(Prisma.sql`${subquery} ${op} ${cond.value}`);
        }
        break;
      }
      case "average_order_value": {
        const subquery = Prisma.sql`(SELECT COALESCE(SUM(total_amount) / NULLIF(COUNT(id), 0), 0) FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered'))`;
        if (cond.operator === "between") {
          sqlConditions.push(Prisma.sql`${subquery} BETWEEN ${cond.value[0]} AND ${cond.value[1]}`);
        } else {
          const op = cond.operator === "gt" ? Prisma.sql`>` : cond.operator === "gte" ? Prisma.sql`>=` : cond.operator === "lt" ? Prisma.sql`<` : cond.operator === "lte" ? Prisma.sql`<=` : Prisma.sql`=`;
          sqlConditions.push(Prisma.sql`${subquery} ${op} ${cond.value}`);
        }
        break;
      }
      case "last_purchase": {
        if (cond.operator === "never") {
          sqlConditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered'))`);
        } else if (cond.operator === "days_ago_lt") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered') AND orders.ordered_at >= (NOW() - ${cond.value} * INTERVAL '1 day'))`);
        } else if (cond.operator === "days_ago_gt") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered') AND orders.ordered_at < (NOW() - ${cond.value} * INTERVAL '1 day'))`);
        } else if (cond.operator === "before_date") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered') AND orders.ordered_at < ${cond.value}::timestamp)`);
        } else if (cond.operator === "after_date") {
          sqlConditions.push(Prisma.sql`EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id AND orders.status::text IN ('paid', 'processing', 'shipped', 'delivered') AND orders.ordered_at > ${cond.value}::timestamp)`);
        }
        break;
      }
      case "customer_created_date": {
        if (cond.operator === "days_ago_lt") {
          sqlConditions.push(Prisma.sql`customers.created_at >= (NOW() - ${cond.value} * INTERVAL '1 day')`);
        } else if (cond.operator === "before_date") {
          sqlConditions.push(Prisma.sql`customers.created_at < ${cond.value}::timestamp`);
        } else if (cond.operator === "after_date") {
          sqlConditions.push(Prisma.sql`customers.created_at > ${cond.value}::timestamp`);
        } else if (cond.operator === "between_dates") {
          sqlConditions.push(Prisma.sql`customers.created_at BETWEEN ${cond.value[0]}::timestamp AND ${cond.value[1]}::timestamp`);
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
