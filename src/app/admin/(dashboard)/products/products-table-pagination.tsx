"use client";

import { TablePagination } from "@mui/material";

import type { ProductTableView } from "./products-table-controls";

export function ProductsTablePagination(props: {
    count: number;
    page: number;
    rowsPerPage: number;
    onPatchView: (patch: Partial<ProductTableView>) => void;
}) {
    const { count, page, rowsPerPage, onPatchView } = props;
    return (
        <TablePagination
            component="div"
            count={count}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, nextPage) => onPatchView({ page: nextPage })}
            onRowsPerPageChange={(e) =>
                onPatchView({
                    rowsPerPage: Number(e.target.value),
                    page: 0,
                })
            }
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count: total }) =>
                `${from}–${to} из ${total}`
            }
        />
    );
}
