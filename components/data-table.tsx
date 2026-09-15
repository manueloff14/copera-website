"use client"

import * as React from "react"
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleCheckIcon,
  Columns3Icon,
  LoaderIcon,
} from "lucide-react"
import type { Corrida } from "@/lib/dashboard-types"

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
})

const columnHelper = createColumnHelper<typeof features, Corrida>()

function pct(x: number) {
  return `${(x * 100).toFixed(0)}%`
}

const columns = columnHelper.columns([
  columnHelper.accessor("nombre", {
    header: "Corrida",
    cell: ({ row }) => <TableCellViewer item={row.original} />,
    enableHiding: false,
  }),
  columnHelper.accessor("brazo", {
    header: "Brazo",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.brazo}
      </Badge>
    ),
  }),
  columnHelper.accessor("etiqueta", {
    header: "Etiqueta",
    cell: ({ row }) => row.original.etiqueta ?? "—",
  }),
  columnHelper.accessor("tokens", {
    header: () => <div className="w-full text-right">Tokens</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.tokens.toLocaleString("es")}
      </div>
    ),
  }),
  columnHelper.accessor("eventos", {
    header: () => <div className="w-full text-right">Eventos</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.eventos}</div>
    ),
  }),
  columnHelper.accessor("agentes_n", {
    header: () => <div className="w-full text-right">Agentes</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.agentes_n}</div>
    ),
  }),
  columnHelper.display({
    id: "tarea",
    header: () => <div className="w-full text-right">Tarea ok</div>,
    cell: ({ row }) => {
      const { tarea_ok, agentes_n } = row.original
      return (
        <div className="flex items-center justify-end gap-1.5">
          {tarea_ok === agentes_n && agentes_n > 0 ? (
            <CircleCheckIcon className="size-3.5 fill-green-500 dark:fill-green-400" />
          ) : (
            <LoaderIcon className="size-3.5" />
          )}
          <span className="tabular-nums text-muted-foreground">
            {tarea_ok}/{agentes_n}
            {agentes_n > 0 ? ` (${pct(tarea_ok / agentes_n)})` : ""}
          </span>
        </div>
      )
    },
  }),
  columnHelper.accessor("claves", {
    header: () => <div className="w-full text-right">Claves</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.claves}</div>
    ),
  }),
  columnHelper.accessor("union", {
    header: () => <div className="w-full text-right">Unión</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.union}</div>
    ),
  }),
])

export function DataTable({ data }: { data: Corrida[] }) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "nombre", desc: true },
  ])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.corrida,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  return (
    <div className="w-full flex-col justify-start gap-4 px-4 lg:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Input
          placeholder="Filtrar por nombre de corrida..."
          value={(table.getColumn("nombre")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("nombre")?.setFilterValue(event.target.value)
          }
          className="h-8 max-w-64"
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Columns3Icon data-icon="inline-start" />
            Columnas
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide()
              )
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Sin corridas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {table.getFilteredRowModel().rows.length} de {data.length} corrida(s)
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Filas por página
            </Label>
            <Select
              value={`${table.state.pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
              items={[10, 20, 30, 40, 50].map((pageSize) => ({
                label: `${pageSize}`,
                value: `${pageSize}`,
              }))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={table.state.pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Página {table.state.pagination.pageIndex + 1} de{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir a la primera página</span>
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir a la página anterior</span>
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir a la página siguiente</span>
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir a la última página</span>
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TableCellViewer({ item }: { item: Corrida }) {
  const isMobile = useIsMobile()
  return (
    <Drawer swipeDirection={isMobile ? "down" : "right"}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="w-fit px-0 text-left text-foreground"
          />
        }
      >
        {item.nombre}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.nombre}</DrawerTitle>
          <DrawerDescription>
            {item.brazo} · {item.rondas} ronda(s) · {item.tokens.toLocaleString("es")} tokens
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-1 text-muted-foreground">
            <div>hash_escena: {item.hash_escena}</div>
            <div>hash_textos: {item.hash_textos}</div>
            <div>ultimo_hash: {item.ultimo_hash}</div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <div className="font-medium">Agentes ({item.agentes.length})</div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Entregado</TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead className="text-right">Pasos rest.</TableHead>
                    <TableHead className="text-right">Gastado</TableHead>
                    <TableHead className="text-right">Puntaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.agentes.map((agente) => (
                    <TableRow key={agente.id}>
                      <TableCell>{agente.id}</TableCell>
                      <TableCell>{agente.entregado}</TableCell>
                      <TableCell>
                        {agente.tarea_correcta ? (
                          <CircleCheckIcon className="size-3.5 fill-green-500 dark:fill-green-400" />
                        ) : (
                          <LoaderIcon className="size-3.5" />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {agente.pasos_restantes}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {agente.gastado}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {agente.puntaje}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <div className="font-medium">Depósitos ({item.depositos.length})</div>
            <div className="grid gap-2">
              {item.depositos.map((deposito, i) => (
                <div
                  key={`${deposito.agente}-${deposito.ronda}-${i}`}
                  className="rounded-lg border p-2"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{deposito.agente}</span>
                    <span>· ronda {deposito.ronda}</span>
                    <span>· vía {deposito.via ?? "—"}</span>
                  </div>
                  <div className="mt-1 line-clamp-3">{deposito.texto}</div>
                </div>
              ))}
              {item.depositos.length === 0 && (
                <div className="text-muted-foreground">Sin depósitos.</div>
              )}
            </div>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>
            Cerrar
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
