import React from 'react';

interface StatusBadgeProps {
  status: 'completed' | 'checked_in' | 'missing_checkout' | 'not_checked_in' | 'admin' | 'employee' | 'active' | 'inactive';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const configs = {
    completed: {
      text: label || 'Completed',
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10',
    },
    checked_in: {
      text: label || 'Checked In',
      style: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-600/10',
    },
    missing_checkout: {
      text: label || 'Missing Checkout',
      style: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10',
    },
    not_checked_in: {
      text: label || 'Not Checked In',
      style: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    admin: {
      text: label || 'Admin',
      style: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-600/10',
    },
    employee: {
      text: label || 'Employee',
      style: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    active: {
      text: label || 'Active',
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    inactive: {
      text: label || 'Inactive',
      style: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${configs.style}`}
    >
      {configs.text}
    </span>
  );
};
