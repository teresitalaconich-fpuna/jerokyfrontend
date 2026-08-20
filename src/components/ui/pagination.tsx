import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "registros",
  className,
}: PaginationProps) {
  const validPageSize = Math.max(1, pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / validPageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * validPageSize + 1;
  const endItem = Math.min(safePage * validPageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (safePage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3.5 py-3 px-1 select-none",
        className
      )}
    >
      {/* Left side: Item count summary & Page size selector */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-slate-600 w-full sm:w-auto">
        <div>
          Mostrando <span className="font-semibold text-slate-900">{startItem}</span> a{" "}
          <span className="font-semibold text-slate-900">{endItem}</span> de{" "}
          <span className="font-semibold text-slate-900">{totalItems}</span> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5">
            <span className="text-slate-500 text-[11px] sm:text-xs">Por pág:</span>
            <select
              aria-label="Cantidad de registros por página"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="h-7 sm:h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#2C58A2]/20 focus:border-[#2C58A2]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {/* First page button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="Ir a la primera página"
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-40"
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Ir a la página anterior"
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-40"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page buttons for medium+ screens */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-xs text-slate-400 font-bold select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === safePage;

            return (
              <Button
                key={pageNum}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "h-8 min-w-[32px] px-2 text-xs font-semibold rounded-md",
                  isActive
                    ? "bg-[#2C58A2] text-white hover:bg-[#224683] shadow-xs border-[#2C58A2]"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200 bg-white"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Compact page indicator on mobile */}
        <div className="flex sm:hidden items-center px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700">
          <span>{safePage} / {totalPages}</span>
        </div>

        {/* Next page button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Ir a la página siguiente"
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-40"
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          aria-label="Ir a la última página"
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-40"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
