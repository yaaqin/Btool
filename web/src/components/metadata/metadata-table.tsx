"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Dictionary } from "@/i18n/dictionaries";
import type { MetaTagRow } from "@/lib/metadata";

const columnHelper = createColumnHelper<MetaTagRow>();

export function MetadataTable({
  tags,
  dict,
}: {
  tags: MetaTagRow[];
  dict: Dictionary;
}) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("tag", {
        header: dict.metadataPage.table.columnTag,
        cell: (info) => (
          <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
            {info.getValue()}
          </code>
        ),
      }),
      columnHelper.accessor("value", {
        header: dict.metadataPage.table.columnValue,
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="break-all">{value}</span>
          ) : (
            <span className="text-muted-foreground">
              {dict.metadataPage.table.empty}
            </span>
          );
        },
      }),
    ],
    [dict]
  );

  const table = useReactTable({
    data: tags,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-left text-sm">
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
