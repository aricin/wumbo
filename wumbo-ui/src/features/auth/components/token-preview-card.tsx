import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TokenPreviewCardProps {
  title: string;
  description: string;
  payload: Record<string, unknown> | { message: string };
}

export function TokenPreviewCard({ title, description, payload }: TokenPreviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-[24px] bg-ink px-5 py-4 font-mono text-sm leading-6 text-stone-100">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
