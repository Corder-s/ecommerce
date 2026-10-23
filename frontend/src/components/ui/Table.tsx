"use client";

import React from "react";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className = "", style, ...props }) => {
  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0",
          textAlign: "left",
          fontSize: "0.875rem",
          color: "var(--color-text-main)",
          ...style,
        }}
        className={className}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = "", style, ...props }) => {
  return (
    <thead
      style={{
        backgroundColor: "var(--color-surface-subtle, #F8F9FE)",
        borderBottom: "1px solid var(--color-border)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </thead>
  );
};

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className = "", style, ...props }) => {
  return (
    <tbody
      style={{
        backgroundColor: "var(--color-surface-card)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </tbody>
  );
};

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  hoverable = true,
  className = "",
  style,
  ...props
}) => {
  return (
    <tr
      style={{
        borderBottom: "1px solid var(--color-border)",
        transition: hoverable ? "background-color var(--transition-fast)" : "none",
        ...style,
      }}
      className={`table-row ${className}`}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover, rgba(91, 92, 226, 0.04))";
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className = "", style, ...props }) => {
  return (
    <th
      style={{
        padding: "0.875rem 1.25rem",
        fontWeight: 600,
        fontSize: "0.78rem",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--color-text-secondary)",
        borderBottom: "1px solid var(--color-border)",
        whiteSpace: "nowrap",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = "", style, ...props }) => {
  return (
    <td
      style={{
        padding: "1rem 1.25rem",
        verticalAlign: "middle",
        borderBottom: "1px solid var(--color-border)",
        fontSize: "0.875rem",
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </td>
  );
};
