"use client";

import { Plus } from "lucide-react";

interface AddClientCardProps {
  onClick: () => void;
}

export function AddClientCard({ onClick }: AddClientCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={[
        "min-h-[160px] rounded-xl border-2 border-dashed border-[#E2E8F0]",
        "flex items-center justify-center cursor-pointer",
        "transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50",
      ].join(" ")}
    >
      <div className="flex flex-col items-center">
        <div className="bg-blue-100 rounded-full p-3 mb-2">
          <Plus className="h-6 w-6 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-slate-500">Add New Client</span>
      </div>
    </div>
  );
}
