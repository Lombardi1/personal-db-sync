import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface UserOption {
  id: string;
  username: string;
}

interface MultiSelectUsersProps {
  options: UserOption[];
  selected: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  currentUser?: UserOption; // To exclude current user from selection
  checkboxClassName?: string; // NUOVO: Prop per personalizzare lo stile del checkbox
}

export function MultiSelectUsers({
  options,
  selected,
  onSelectionChange,
  placeholder = "Seleziona partecipanti...",
  disabled = false,
  currentUser,
  checkboxClassName, // Destruttura la nuova prop
}: MultiSelectUsersProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (userId: string) => {
    const newSelected = selected.includes(userId)
      ? selected.filter((id) => id !== userId)
      : [...selected, userId];
    onSelectionChange(newSelected);
  };

  const displaySelected = selected
    .map((id) => options.find((option) => option.id === id)?.username)
    .filter(Boolean)
    .join(", ");

  const filteredOptions = options.filter(
    (option) => currentUser ? option.id !== currentUser.id : true
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selected.length > 0 ? displaySelected : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Cerca utente..." />
          <CommandList>
            <CommandEmpty>Nessun utente trovato.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((userOption) => (
                <CommandItem
                  key={userOption.id}
                  value={userOption.username}
                  onSelect={() => handleSelect(userOption.id)}
                >
                  <Checkbox
                    checked={selected.includes(userOption.id)}
                    onCheckedChange={() => handleSelect(userOption.id)}
                    className={cn("mr-2", checkboxClassName)} {/* Applica la classe personalizzata qui */}
                  />
                  {userOption.username}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}