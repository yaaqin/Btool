"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangleIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries";
import type { MetaTagRow } from "@/lib/metadata";

// One table row per tag, with the raw-HTML value and (when rendering ran)
// the rendered-DOM value side by side — the comparison is the point.
interface ComparedRow {
  tag: string;
  raw: MetaTagRow;
  rendered?: MetaTagRow;
}

const columnHelper = createColumnHelper<ComparedRow>();

export function MetadataTable({
  tags,
  renderedTags,
  dict,
}: {
  tags: MetaTagRow[];
  // Omitted when rendering didn't run — the table then shows raw only.
  renderedTags?: MetaTagRow[];
  dict: Dictionary;
}) {
  const t = dict.metadataPage.table;

  const rows = useMemo<ComparedRow[]>(() => {
    const byTag = new Map(renderedTags?.map((r) => [r.tag, r]));
    return tags.map((raw) => ({
      tag: raw.tag,
      raw,
      rendered: renderedTags ? (byTag.get(raw.tag) ?? { tag: raw.tag, value: "" }) : undefined,
    }));
  }, [tags, renderedTags]);

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor("tag", {
        header: t.columnTag,
        cell: (info) => (
          <code className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
            {info.getValue()}
          </code>
        ),
      }),
      columnHelper.accessor("raw", {
        header: renderedTags ? t.columnRaw : t.columnValue,
        cell: (info) => <ValueCell row={info.getValue()} dict={dict} />,
      }),
    ];
    if (renderedTags) {
      cols.push(
        columnHelper.accessor("rendered", {
          header: t.columnRendered,
          cell: (info) => (
            <ValueCell
              row={info.getValue()!}
              compareTo={info.row.original.raw}
              dict={dict}
            />
          ),
        }) as (typeof cols)[number]
      );
    }
    return cols;
  }, [dict, t, renderedTags]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className={`w-full text-left text-sm ${renderedTags ? "min-w-[40rem]" : "min-w-[28rem]"}`}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border/60 bg-muted/50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2.5 text-xs font-semibold text-muted-foreground"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-b-0">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2.5 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValueCell({
  row,
  compareTo,
  dict,
}: {
  row: MetaTagRow;
  // The raw value, when this cell is the rendered column.
  compareTo?: MetaTagRow;
  dict: Dictionary;
}) {
  const t = dict.metadataPage.table;

  let diff: string | null = null;
  if (compareTo && row.value && row.value !== compareTo.value) {
    diff = compareTo.value ? t.diffChanged : t.diffJsOnly;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {row.value ? (
        <span className="whitespace-pre-line [overflow-wrap:anywhere]">{row.value}</span>
      ) : (
        <span className="text-muted-foreground">{t.empty}</span>
      )}
      {row.issue && (
        <span className="inline-flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangleIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          {t.issues[row.issue]}
        </span>
      )}
      {diff && (
        <span className="w-fit rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
          {diff}
        </span>
      )}
    </div>
  );
}
