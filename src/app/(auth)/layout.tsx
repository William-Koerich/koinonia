import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link href="/" className="mb-6 font-heading text-xl font-semibold">
        {siteConfig.nome}
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
