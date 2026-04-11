import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta = {
  title: "UI/Field",
  component: Field,
  tags: ["autodocs"],
  render: () => (
    <div className="w-[360px]">
      <Field>
        <Label htmlFor="storybook-field">Display Name</Label>
        <Input id="storybook-field" placeholder="Avery Stone" />
        <FieldDescription>
          Composite fields keep labels, controls, and helper text aligned.
        </FieldDescription>
      </Field>
    </div>
  ),
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
