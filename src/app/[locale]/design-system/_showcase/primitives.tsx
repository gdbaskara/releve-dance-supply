"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Heart, Search, ShoppingBag, X } from "lucide-react";
import {
  Accordion,
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  Chip,
  Combobox,
  CopyButton,
  Dialog,
  DialogContent,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerTrigger,
  IconButton,
  InfoTip,
  Input,
  LoadMore,
  Notice,
  Radio,
  RadioCard,
  RadioGroup,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  Textarea,
  TextLink,
  Tooltip,
  useToast,
} from "@/components/ui";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";
import type { ShowcaseData } from "./mock-data";
import { Group, Specimen } from "./frame";

export function Primitives({ provinces }: { provinces: ShowcaseData["provinces"] }) {
  const t = useTranslations("designSystem");
  const { toast } = useToast();
  const [city, setCity] = React.useState<string | null>("Kota Bandung");
  const [chips, setChips] = React.useState<string[]>(["7.5"]);
  const [seg, setSeg] = React.useState<string | null>("Medium");
  const [radio, setRadio] = React.useState("a");
  const [card, setCard] = React.useState("jne");
  const [agree, setAgree] = React.useState(true);
  const [shown, setShown] = React.useState(24);
  const cities = React.useMemo(
    () => provinces.flatMap((p) => p.cities.map((c) => ({ value: c.name, label: c.name, hint: p.name }))),
    [provinces],
  );

  return (
    <>
      <Group id="buttons" title="Button" description={t("primitives.button.description")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label={t("primitives.button.variants")} code='variant="primary|secondary|ghost|whatsapp|danger"'>
            <div className="flex flex-wrap gap-3">
              <Button>{t("primitives.button.addToCart")}</Button>
              <Button variant="secondary">{t("primitives.button.sizeConsult")}</Button>
              <Button variant="ghost">{t("primitives.button.seeAll")}</Button>
              <Button variant="whatsapp" leadingIcon={<WhatsAppIcon />}>
                {t("primitives.button.askWa")}
              </Button>
              <Button variant="danger" size="sm">
                {t("primitives.button.danger")}
              </Button>
            </div>
          </Specimen>
          <Specimen label={t("primitives.button.states")} code="loading · disabled · size=&quot;sm&quot; · fullWidth">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Button loading>{t("primitives.button.payNow")}</Button>
                <Button disabled>{t("primitives.button.disabled")}</Button>
                <Button size="sm" variant="secondary">
                  {t("primitives.button.small")}
                </Button>
              </div>
              <Button fullWidth>{t("primitives.button.checkout")}</Button>
            </div>
          </Specimen>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="IconButton · 44×44" code='variant="ghost|outline" badge={n}'>
            <div className="flex items-center gap-3">
              <IconButton label={t("primitives.icon.search")}>
                <Search size={24} strokeWidth={1.5} aria-hidden />
              </IconButton>
              <IconButton label={t("primitives.icon.cart")} badge={3}>
                <ShoppingBag size={24} strokeWidth={1.5} aria-hidden />
              </IconButton>
              <IconButton label={t("primitives.icon.wishlist")} variant="outline">
                <Heart size={20} strokeWidth={1.5} aria-hidden />
              </IconButton>
              <IconButton label={t("primitives.icon.close")} variant="outline" disabled>
                <X size={20} strokeWidth={1.5} aria-hidden />
              </IconButton>
            </div>
          </Specimen>
          <Specimen label="Link" code='linkStyles({ variant: "inline|nav|subtle" })'>
            <div className="flex flex-col items-start gap-3">
              <p className="text-base">
                {t("primitives.link.sentence")} <TextLink href="#sizeguide">{t("primitives.link.inline")}</TextLink>.
              </p>
              <div className="flex gap-6">
                <TextLink variant="nav" href="#buttons">
                  Shoes
                </TextLink>
                <TextLink variant="nav" href="#buttons">
                  Pointe
                </TextLink>
                <TextLink variant="nav" href="#buttons">
                  Dancewear
                </TextLink>
              </div>
              <TextLink variant="subtle" href="#buttons">
                {t("primitives.link.subtle")}
              </TextLink>
            </div>
          </Specimen>
        </div>
      </Group>

      <Group title={t("primitives.inputs.title")} description={t("primitives.inputs.description")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label={t("primitives.inputs.states")}>
            <div className="flex flex-col gap-5">
              <Input label={t("primitives.inputs.name")} placeholder="Rina Wijaya" autoComplete="off" />
              <Input label={t("primitives.inputs.email")} optional type="email" defaultValue="rina@" error={t("primitives.inputs.emailError")} />
              <Input label={t("primitives.inputs.order")} readOnly defaultValue="RLV-261105-0042" className="font-mono" />
              <Input label={t("primitives.inputs.disabled")} disabled defaultValue="DKI Jakarta" />
            </div>
          </Specimen>
          <Specimen label={t("primitives.inputs.adornments")}>
            <div className="flex flex-col gap-5">
              <Input label={t("primitives.inputs.wa")} prefix="+62" inputMode="tel" placeholder="812-3456-7890" helper={t("primitives.inputs.waHelp")} />
              <Input label={t("primitives.inputs.foot")} inputMode="decimal" defaultValue="23.5" suffix={<span className="pr-3 text-sm">cm</span>} />
              <Select
                label={t("primitives.inputs.province")}
                placeholder={t("primitives.inputs.choose")}
                defaultValue=""
                options={provinces.map((p) => ({ value: p.name, label: p.name }))}
              />
              <Combobox label={t("primitives.inputs.city")} options={cities} value={city} onChange={setCity} helper={t("primitives.inputs.cityHelp", { n: cities.length })} />
              <Textarea label={t("primitives.inputs.address")} placeholder="Jl. Kemang Raya No. 12, RT 03/RW 05" />
            </div>
          </Specimen>
        </div>
      </Group>

      <Group title={t("primitives.choice.title")} description={t("primitives.choice.description")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Specimen label="Checkbox">
            <div className="flex flex-col">
              <Checkbox checked={agree} onCheckedChange={(c) => setAgree(c === true)} label={t("primitives.choice.waOptIn")} description={t("primitives.choice.waOptInHelp")} />
              <Checkbox label={t("primitives.choice.unchecked")} />
              <Checkbox checked="indeterminate" label={t("primitives.choice.indeterminate")} />
              <Checkbox disabled label={t("primitives.choice.disabled")} />
              <Checkbox label={t("primitives.choice.terms")} error={t("primitives.choice.termsError")} />
            </div>
          </Specimen>
          <Specimen label="Radio">
            <RadioGroup legend={t("primitives.choice.radioLegend")} showLegend value={radio} onValueChange={setRadio} className="gap-0">
              <Radio value="a" label={t("primitives.choice.radioA")} description={t("primitives.choice.radioAHelp")} />
              <Radio value="b" label={t("primitives.choice.radioB")} />
              <Radio value="c" label={t("primitives.choice.radioC")} disabled />
            </RadioGroup>
          </Specimen>
          <Specimen label="RadioCard" code="selected = 2px ink border">
            <RadioGroup legend="RadioCard" value={card} onValueChange={setCard}>
              <RadioCard value="jne" title="JNE YES" description={t("primitives.choice.etaTomorrow")} aside="Rp 18.000" />
              <RadioCard value="reg" title="JNE REG" description={t("primitives.choice.eta2")} aside="Rp 10.000" />
              <RadioCard value="off" title="GoSend Instant" description={t("primitives.choice.instantOff")} aside="Rp 38.000" disabled />
            </RadioGroup>
          </Specimen>
        </div>
      </Group>

      <Group title={t("primitives.labels.title")} description={t("primitives.labels.description")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="Badge" code='variant="neutral|success|warning|error|info|accent"'>
            <div className="flex flex-wrap gap-2">
              <Badge>{t("primitives.labels.neutral")}</Badge>
              <Badge variant="success">Ready</Badge>
              <Badge variant="warning">Pre-order</Badge>
              <Badge variant="error">{t("primitives.labels.failed")}</Badge>
              <Badge variant="info">Demo</Badge>
              <Badge variant="accent">{t("primitives.labels.new")}</Badge>
              <Badge variant="solid">Kids</Badge>
              <Badge variant="outline">SD09</Badge>
            </div>
          </Specimen>
          <Specimen label="Chip (filter) · 36px pill" code="selected · unselected · disabled">
            <div className="flex flex-wrap gap-2">
              {["6", "6.5", "7", "7.5", "8"].map((s) => (
                <Chip key={s} selected={chips.includes(s)} onClick={() => setChips((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}>
                  {s}
                </Chip>
              ))}
              <Chip disabled>8.5</Chip>
              <Chip count={12}>Ballet</Chip>
            </div>
          </Specimen>
          <Specimen label="SegmentedControl" code="radiogroup · arrow keys">
            <div className="flex flex-col gap-4">
              <SegmentedControl
                label="Width"
                value={seg}
                onChange={setSeg}
                options={[
                  { value: "Narrow", label: "Narrow" },
                  { value: "Medium", label: "Medium" },
                  { value: "Wide", label: "Wide", unavailable: true, srHint: t("primitives.labels.soldOut") },
                ]}
              />
              <SegmentedControl
                label="Width (A–EE)"
                size="sm"
                value="C"
                onChange={() => {}}
                options={["A", "B", "C", "D", "E", "EE"].map((w) => ({ value: w, label: w, disabled: w === "EE" }))}
              />
            </div>
          </Specimen>
          <Specimen label="Tabs">
            <Tabs
              label={t("primitives.labels.tabsLabel")}
              items={[
                { value: "desc", label: t("primitives.labels.tabDesc"), content: <p className="text-sm text-ink-muted">{t("primitives.labels.tabDescBody")}</p> },
                { value: "fit", label: t("primitives.labels.tabFit"), content: <p className="text-sm text-ink-muted">{t("primitives.labels.tabFitBody")}</p> },
                { value: "care", label: t("primitives.labels.tabCare"), content: <p className="text-sm text-ink-muted">{t("primitives.labels.tabCareBody")}</p> },
              ]}
            />
          </Specimen>
        </div>
      </Group>

      <Group title={t("primitives.disclosure.title")} description={t("primitives.disclosure.description")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="Accordion">
            <Accordion
              defaultOpen="desc"
              items={[
                { value: "desc", title: t("primitives.disclosure.description1"), content: <p className="text-sm text-ink-muted">{t("primitives.disclosure.body1")}</p> },
                { value: "ship", title: t("primitives.disclosure.shipping"), content: <p className="text-sm text-ink-muted">{t("primitives.disclosure.body2")}</p> },
                { value: "pay", title: t("primitives.disclosure.payment"), content: <p className="text-sm text-ink-muted">{t("primitives.disclosure.body3")}</p> },
              ]}
            />
          </Specimen>
          <Specimen label="Dialog · Sheet · Drawer · Toast · Tooltip">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">Dialog</Button>
                  </DialogTrigger>
                  <DialogContent
                    variant="center"
                    size="sm"
                    title={t("primitives.disclosure.dialogTitle")}
                    description={t("primitives.disclosure.dialogDesc")}
                    footer={<Button fullWidth>{t("primitives.disclosure.dialogCta")}</Button>}
                  >
                    <p className="text-sm text-ink-muted">{t("primitives.disclosure.dialogBody")}</p>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">Sheet</Button>
                  </DialogTrigger>
                  <DialogContent variant="responsive" title={t("primitives.disclosure.sheetTitle")}>
                    <p className="text-sm text-ink-muted">{t("primitives.disclosure.sheetBody")}</p>
                  </DialogContent>
                </Dialog>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="secondary" size="sm">Drawer</Button>
                  </DrawerTrigger>
                  <DrawerContent title={t("primitives.disclosure.drawerTitle")}>
                    <p className="text-sm text-ink-muted">{t("primitives.disclosure.drawerBody")}</p>
                  </DrawerContent>
                </Drawer>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" variant="ghost" onClick={() => toast({ title: t("primitives.disclosure.toastSuccess"), variant: "success" })}>
                  Toast · success
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toast({ title: t("primitives.disclosure.toastError"), description: t("primitives.disclosure.toastErrorBody"), variant: "error" })}>
                  Toast · error
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toast({ title: t("primitives.disclosure.toastInfo"), variant: "info" })}>
                  Toast · info
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Tooltip content={t("primitives.disclosure.tooltip")}>
                  <button type="button" className="min-h-11 rounded-sm underline decoration-dotted underline-offset-4">
                    Tooltip (hover/focus)
                  </button>
                </Tooltip>
                <span className="inline-flex items-center">
                  Shank
                  <InfoTip label={t("primitives.disclosure.infoTip")} content={t("primitives.disclosure.shankExplain")} />
                </span>
              </div>
            </div>
          </Specimen>
        </div>
      </Group>

      <Group title={t("primitives.feedback.title")} description={t("primitives.feedback.description")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Specimen label="Notice" className="lg:col-span-2">
            <div className="grid gap-3 md:grid-cols-2">
              <Notice tone="info" title={t("primitives.feedback.pointeTitle")}>
                {t("primitives.feedback.pointeBody")}
              </Notice>
              <Notice tone="warning">{t("primitives.feedback.qtyReduced")}</Notice>
              <Notice tone="error" title={t("primitives.feedback.stockTitle")} actions={<Button size="sm" variant="secondary">{t("primitives.feedback.updateCart")}</Button>}>
                {t("primitives.feedback.stockBody")}
              </Notice>
              <Notice tone="success">{t("primitives.feedback.voucher")}</Notice>
            </div>
          </Specimen>
          <Specimen label="Skeleton · Spinner">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </div>
              <Skeleton variant="text" lines={2} />
              <div className="flex items-center gap-3 text-sm text-ink-muted">
                <Spinner label={t("primitives.feedback.loading")} /> {t("primitives.feedback.loading")}
              </div>
            </div>
          </Specimen>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Specimen label="Breadcrumb">
            <Breadcrumb label={t("primitives.feedback.breadcrumb")} items={[{ label: t("primitives.feedback.home"), href: "#" }, { label: "Pointe", href: "#" }, { label: "Claudia Satin" }]} />
          </Specimen>
          <Specimen label="CopyButton" code='value="RLV-261105-0042"'>
            <div className="flex flex-wrap items-center gap-3">
              <span className="tabular font-mono text-sm">RLV-261105-0042</span>
              <CopyButton value="RLV-261105-0042" />
              <CopyButton value="RLV-261105-0042" appearance="outline" />
            </div>
          </Specimen>
          <Specimen label="LoadMore · 24/page" bodyClassName="py-0">
            <LoadMore shown={shown} total={96} onLoadMore={() => setShown((s) => Math.min(96, s + 24))} />
          </Specimen>
        </div>
      </Group>
    </>
  );
}
