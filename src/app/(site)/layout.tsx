import { SiteFooter } from "@/components/site/footer";
import { MotionProvider } from "@/components/site/fx/motion-provider";
import { SiteHeader } from "@/components/site/header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    // "site": tema claro do site público (globals.css)
    <div id="topo" className="site flex min-h-full flex-1 flex-col">
      <MotionProvider>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </MotionProvider>
    </div>
  );
}
