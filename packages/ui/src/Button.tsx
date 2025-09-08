import * as React from 'react';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string };
export const Button: React.FC<Props> = ({ label = 'Click', ...rest }) => (
  <button className="px-4 py-2 rounded" {...rest}>{label}</button>
);
