import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';

interface DivProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const Div = forwardRef<HTMLDivElement, DivProps>(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
));

Div.displayName = 'Div';

export default Div;