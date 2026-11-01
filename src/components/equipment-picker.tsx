"use client";
import { EquipmentWorkbench } from "./equipment-workbench";
import { BuildEquipmentStudio, type BuildStudioView } from "./build-equipment-studio";
import type { EquipmentChoice } from "@/lib/compositions/validation";
export function EquipmentPicker(props: {
  value: EquipmentChoice[];
  onChange: (value: EquipmentChoice[]) => void;
  variant?: "build" | "embedded";
  view?: BuildStudioView;
  captureUndo?: () => () => void;
}) {
  return props.variant === "build" ? (
    <BuildEquipmentStudio {...props} />
  ) : (
    <EquipmentWorkbench {...props} />
  );
}
