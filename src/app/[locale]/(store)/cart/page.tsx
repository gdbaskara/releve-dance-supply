import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartPageView } from "@/components/store/containers/cart-page-view";
import { pageMetadata } from "@/components/store/containers/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return pageMetadata({ locale, path: "/cart", title: t("metaTitle"), description: t("emptyBody"), noIndex: true });
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  return (
    <div className="container-page flex flex-col gap-6 py-6 lg:gap-8 lg:py-10">
      <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">{t("title")}</h1>
      <CartPageView />
    </div>
  );
}
