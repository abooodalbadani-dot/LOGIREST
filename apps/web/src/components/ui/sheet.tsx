import * as React from "react"

interface SheetProps {
 children: React.ReactNode
 open?: boolean
 onOpenChange?: (open: boolean) => void
}

export const Sheet = ({ children, open }: SheetProps) => <>{open ? children : null}</>;

interface SheetContentProps {
 children: React.ReactNode
 className?: string
 side?: 'top' | 'right' | 'bottom' | 'left'
}

export const SheetContent = ({ children, className, side }: SheetContentProps) => (
 <div className={className} data-side={side}>{children}</div>
);

interface SheetHeaderProps {
 children: React.ReactNode
}

export const SheetHeader = ({ children }: SheetHeaderProps) => <div>{children}</div>;

interface SheetTitleProps {
 children: React.ReactNode
 className?: string
}

export const SheetTitle = ({ children, className }: SheetTitleProps) => <h2 className={className}>{children}</h2>;
