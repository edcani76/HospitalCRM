import { Button } from "./button";
import { Plus } from "lucide-react";

interface AddButtonProps {
  text: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function AddButton({
  text,
  onClick,
  className = "",
  disabled = false,
  variant = "outline",
  size = "sm",
}: AddButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap ${className}`}
      disabled={disabled}
      variant={variant}
      size={size}
    >
      <Plus className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
}
