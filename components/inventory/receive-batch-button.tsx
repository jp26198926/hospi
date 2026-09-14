"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReceiveBatchDialog } from "./receive-batch-dialog";

interface Medication {
  id: string;
  genericName: string;
  strength: string;
  dosageForm: string;
}

interface ReceiveBatchButtonProps {
  medications: Medication[];
}

export function ReceiveBatchButton({ medications }: ReceiveBatchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Receive Batch</Button>
      <ReceiveBatchDialog
        open={open}
        onClose={() => setOpen(false)}
        medications={medications}
      />
    </>
  );
}
