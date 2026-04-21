import { StocktakesClient } from "./stocktakes-client";

export const metadata = {
  title: "الجرد | LogiRest",
  description: "إدارة جلسات الجرد الدوري للمستودعات.",
};

export default function StocktakesPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StocktakesClient />
    </div>
  );
}
