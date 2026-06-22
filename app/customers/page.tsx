import type { Metadata } from "next";
import { CustomersWorkspace } from "@/features/customers/components/customers-workspace";

export const metadata: Metadata = {
  title: "Customers | SuperChannel",
  description: "Mock customer directory for SuperChannel.",
};

export default function CustomersPage() {
  return <CustomersWorkspace />;
}
