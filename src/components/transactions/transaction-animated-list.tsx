"use client";

import { useRouter } from "next/navigation";
import AnimatedList from "@/components/ui/animated-list";
import { TransactionRow } from "./transaction-row";
import type { TxWithMeta } from "@/lib/data/transactions";

export function TransactionAnimatedList({ txs }: { txs: TxWithMeta[] }) {
  const router = useRouter();

  const items = txs.map((t) => <TransactionRow key={t.id} tx={t} />);

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-muted-foreground">{txs.length} transaksi</p>
      <AnimatedList
        items={items}
        onItemSelect={(_, index) => {
          const tx = txs[index];
          if (tx) router.push(`/transactions/${tx.id}`);
        }}
        showGradients={true}
        enableArrowNavigation={true}
        displayScrollbar={false}
        className="w-full"
        itemClassName=""
        initialSelectedIndex={-1}
      />
    </div>
  );
}
