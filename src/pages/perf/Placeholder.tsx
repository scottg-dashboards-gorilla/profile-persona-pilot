import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Placeholder({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: string;
}) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center text-center gap-4">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground/60">
          <rect x="14" y="20" width="68" height="56" rx="6" />
          <path d="M14 36h68" />
          <path d="M30 54h20" />
          <path d="M30 62h36" />
        </svg>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-md mt-1">{description}</p>
        </div>
        {cta && <Button>{cta}</Button>}
      </CardContent>
    </Card>
  );
}