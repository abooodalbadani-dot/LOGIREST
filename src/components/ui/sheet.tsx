import * as React from "react"
export const Sheet = ({ children, open, onOpenChange }: any) => <>{open ? children : null}</>;
export const SheetContent = ({ children, className }: any) => <div className={className}>{children}</div>;
export const SheetHeader = ({ children }: any) => <div>{children}</div>;
export const SheetTitle = ({ children }: any) => <h2>{children}</h2>;
