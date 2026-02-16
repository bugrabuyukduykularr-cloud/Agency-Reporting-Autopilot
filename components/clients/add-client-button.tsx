"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddClientDialog } from "@/components/clients/add-client-dialog";

interface AddClientButtonProps {
  agencyId: string;
  label?: string;
}

export function AddClientButton({
  agencyId,
  label = "Add Client",
}: AddClientButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <AddClientDialog open={open} onOpenChange={setOpen} agencyId={agencyId} />
    </>
  );
}
