import { redirect } from "next/navigation";

/** Old address of the design editor */
export default function DesignPage() {
  redirect("/admin/website/appearance");
}
