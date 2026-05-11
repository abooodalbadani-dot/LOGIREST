import { GRNForm } from "@/features/purchasing/components/grn-form";

export const metadata = {
 title: "Create GRN | LogiRest",
 description: "Create a new Goods Receipt Note.",
};

export default function CreateGRNPage() {
 return <GRNForm id="new" />;
}
