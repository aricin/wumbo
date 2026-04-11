import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  render: () => (
    <Card className="w-[420px]">
      <CardHeader>
        <CardTitle>Foundation Card</CardTitle>
        <CardDescription>
          Use cards for grouped content blocks, settings panels, and summary surfaces.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-olive-700">
        This foundation keeps spacing, border treatment, and elevation consistent.
      </CardContent>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
