import { useState } from "react";
import { RotateCcw, Info, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SystemSettings() {
  // Configuraciones generales del sistema

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="h-4 w-4" />About</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Version</dt><dd className="font-medium">1.0.0</dd>
            <dt className="text-muted-foreground">Platform</dt><dd className="font-medium">UniversumK9 Stack Inventory</dd>
          </dl>
        </CardContent>
      </Card>


    </div>
  );
}
