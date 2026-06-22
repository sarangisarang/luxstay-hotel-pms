import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function Badge({ className = "", ...props }: BadgeProps) {
    return (
        <span
            className={
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
                "bg-gray-100 text-gray-900 " +
                className
            }
            {...props}
        />
    );
}