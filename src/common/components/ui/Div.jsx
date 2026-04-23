import React, { forwardRef } from 'react';

const Div = forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
));

Div.displayName = 'Div';

export default Div;