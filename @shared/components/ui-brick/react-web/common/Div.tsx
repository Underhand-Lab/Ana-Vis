import React, { forwardRef, ReactNode, HTMLAttributes } from 'react';
import vars from '../../variables';

interface DivProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
}

const Div = forwardRef<HTMLDivElement, DivProps>(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
));

Div.displayName = 'Div';

export default Div;