import { Badge } from "@/components/ui/badge";
import { Check, X, Minus } from "lucide-react";
import type { TradeResult } from "@/lib/utils";

interface ResultBadgeProps {
  result: TradeResult;
}

export function ResultBadge({ result }: ResultBadgeProps) {
  if (result === "unknown") {
    return <span className="text-muted-foreground">-</span>;
  }

  if (result === "breakeven") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        B/E
      </Badge>
    );
  }

  const isWin = result === "win";
  return (
    <Badge variant={isWin ? "success" : "danger"} className="gap-1">
      {isWin ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {isWin ? "WIN" : "LOSS"}
    </Badge>
  );
}
