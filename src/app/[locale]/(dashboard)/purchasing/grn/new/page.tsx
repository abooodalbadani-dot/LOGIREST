import { GRNForm } from "./grn-form";

export const metadata = {
  title: "Create GRN | LogiRest",
  description: "Create a new Goods Receipt Note.",
};

export default function CreateGRNPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <GRNForm />
    </div>
  );
}
