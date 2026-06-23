import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { normalizeDigits } from "@/utils/number"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.ComponentProps<"input"> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, dir, lang, inputMode, onChange, ...props }, ref) => {
    // If the type is explicitly "number", map to type="text" and inputMode="decimal"
    const isNumberType = type === "number";
    const mappedType = isNumberType ? "text" : type;
    const mappedInputMode = isNumberType ? "decimal" : inputMode;

    const numeric =
      type === "number" ||
      inputMode === "decimal" ||
      inputMode === "numeric";

    // Normalize input characters to Western numerals for text-based number fields and numeric input modes
    const isDigitNormalizing =
      isNumberType ||
      inputMode === "numeric" ||
      inputMode === "decimal";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isDigitNormalizing) {
        e.target.value = normalizeDigits(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <InputPrimitive
        ref={ref}
        type={mappedType}
        inputMode={mappedInputMode}
        onChange={handleChange}
        dir={numeric ? "ltr" : (dir ?? (type === "tel" ? "ltr" : undefined))}
        lang={numeric ? "en" : (lang ?? undefined)}
        style={{
          ...props.style,
          WebkitLocale: numeric ? '"en"' : undefined,
        }}
        data-slot="input"
        data-numeric={numeric ? "true" : undefined}
        className={cn(
          "flex h-10 w-full rounded-md bg-background/50 border border-brand-gold/40 hover:border-brand-gold/70 px-4 py-2 text-sm text-text-main dark:text-white shadow-sm transition-colors duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:border-brand-gold focus-visible:ring-1 focus-visible:ring-brand-gold/50 backdrop-blur-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500",
          "dark:text-foreground",
          numeric && "font-numeric",
          isNumberType && "text-center",
          type === "date" && "text-right",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input }
