"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import type { MenuItemView, MenuView } from "@/lib/data/catalogue";
import { fromPriceCents } from "@/lib/pricing/item";

import { CategoryNav } from "./category-nav";
import { ItemQuerySync } from "./item-query-sync";
import { ItemSheet } from "./item-sheet";
import { MenuItemCard, type ItemAvailability } from "./menu-item-card";
import { useSelectedBranch } from "./use-selected-branch";

export type MenuBranch = { id: string; name: string };

const FILTERS = ["vegetarian", "vegan", "halal", "nut-free"] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilters(item: MenuItemView, filters: Set<Filter>) {
  const tags = item.dietaryTags;
  if (filters.has("vegetarian") && !tags.includes("vegetarian") && !tags.includes("vegan"))
    return false;
  if (filters.has("vegan") && !tags.includes("vegan")) return false;
  if (filters.has("halal") && !tags.includes("halal")) return false;
  if (filters.has("nut-free") && tags.includes("contains-nuts")) return false;
  return true;
}

/** Lower-cased search text. Includes the English slug so "kottu" finds dishes on the Sinhala and Tamil pages. */
const haystack = (item: MenuItemView) =>
  `${item.name} ${item.description} ${item.slug.replace(/-/g, " ")}`.toLocaleLowerCase();

export function MenuBrowser({ menu, branches }: { menu: MenuView; branches: MenuBranch[] }) {
  const t = useTranslations("Menu");
  const dietary = useTranslations("Dietary");
  const [branchId, setBranchId] = useSelectedBranch(branches.map((b) => b.id));
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const overrides = menu.overrides[branchId] ?? {};
  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";

  // The React Compiler memoizes this; no useCallback needed.
  function availabilityOf(item: MenuItemView): ItemAvailability {
    if (overrides[item.id]?.isAvailable === false) return "sold-out";
    if (item.isAlcohol && menu.alcoholFreeToday) return "not-today";
    return "available";
  }

  const categories = useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase();
    return menu.categories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) => (!q || haystack(item).includes(q)) && matchesFilters(item, filters),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [menu.categories, deferredQuery, filters]);

  const resultCount = categories.reduce((n, c) => n + c.items.length, 0);
  const filtering = deferredQuery.trim() !== "" || filters.size > 0;
  const openItem = useMemo(
    () =>
      openSlug
        ? (menu.categories.flatMap((c) => c.items).find((i) => i.slug === openSlug) ?? null)
        : null,
    [menu.categories, openSlug],
  );

  function open(slug: string | null) {
    setOpenSlug(slug);
    // Shareable link without a navigation; ItemQuerySync sees the change too.
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("item", slug);
    else url.searchParams.delete("item");
    window.history.replaceState(window.history.state, "", url);
  }

  function toggleFilter(filter: Filter, on: boolean) {
    setFilters((current) => {
      const next = new Set(current);
      if (on) next.add(filter);
      else next.delete(filter);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ItemQuerySync onChange={setOpenSlug} />
      </Suspense>

      <div className="grid gap-4 rounded-[2rem] bg-card p-4 shadow-lifted ring-1 ring-border/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6">
        <div className="space-y-2">
          <label htmlFor="menu-search" className="text-sm font-medium text-muted-foreground">
            {t("search")}
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="menu-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-12 rounded-full bg-background pl-10 text-base"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="space-y-2">
          <span id="branch-label" className="text-sm font-medium text-muted-foreground">
            {t("orderingFrom")}
          </span>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger
              aria-labelledby="branch-label"
              className="h-12 w-full rounded-full bg-background px-5 sm:w-60"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div role="group" aria-label={t("filters")} className="flex flex-wrap gap-2 sm:col-span-2">
          {FILTERS.map((filter) => (
            <Toggle
              key={filter}
              variant="outline"
              size="sm"
              pressed={filters.has(filter)}
              onPressedChange={(on) => toggleFilter(filter, on)}
              className="h-9 rounded-full px-4 transition-[background-color,color,border-color,scale] active:scale-[0.97] data-[state=on]:border-secondary data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
            >
              {filter === "nut-free" ? t("nutFree") : dietary(filter)}
            </Toggle>
          ))}
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {filtering ? t("results", { count: resultCount }) : ""}
      </p>

      {categories.length > 0 && (
        <CategoryNav
          categories={categories.map((c) => ({
            slug: c.slug,
            name: c.name,
            count: c.items.length,
          }))}
        />
      )}

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("noResults")}</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setFilters(new Set());
            }}
          >
            <X data-icon="inline-start" aria-hidden />
            {t("clearFilters")}
          </Button>
        </div>
      ) : (
        <div className="space-y-20 lg:space-y-28">
          {categories.map((category) => (
            <section
              key={category.id}
              id={category.slug}
              aria-labelledby={`${category.slug}-title`}
              className="scroll-mt-40"
            >
              {/* A chapter of the menu: its number drawn in outline, the name as a poster. */}
              <div
                data-reveal
                className="mb-8 flex items-start gap-4 border-b-2 border-foreground pb-5 sm:items-end sm:gap-6 lg:mb-10"
              >
                <span
                  aria-hidden
                  className="outline-number font-poster text-display-2xl leading-[0.8] tabular-nums"
                >
                  {String(menu.categories.findIndex((c) => c.id === category.id) + 1).padStart(
                    2,
                    "0",
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 id={`${category.slug}-title`} className="text-display-xl text-balance">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="max-w-2xl text-pretty text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </div>
                <span
                  aria-hidden
                  className="hidden shrink-0 rounded-full bg-foreground px-3 py-1.5 font-poster text-lg leading-none text-background sm:block"
                >
                  {category.items.length}
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {category.items.map((item, i) => (
                  <li key={item.id} data-reveal>
                    <MenuItemCard
                      item={item}
                      index={i}
                      priceCents={fromPriceCents(item, overrides[item.id]?.priceCents)}
                      availability={availabilityOf(item)}
                      onOpen={() => open(item.slug)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ItemSheet
        item={openItem}
        branchId={branchId}
        branchName={branchName}
        branchPriceCents={openItem ? (overrides[openItem.id]?.priceCents ?? null) : null}
        availability={openItem ? availabilityOf(openItem) : "available"}
        holidayName={menu.alcoholFreeToday?.name ?? null}
        onClose={() => open(null)}
      />
    </div>
  );
}
