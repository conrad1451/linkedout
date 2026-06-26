import React from 'react';

export function RecordList({
  children,
  header,
  footer,
  className,
}: {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm ${className ?? ''}`}
    >
      {header ? (
        <div className="border-b border-base-300 px-4 py-4 sm:px-5 sm:py-5">{header}</div>
      ) : null}
      <div>{children}</div>
      {footer ? (
        <div className="border-t border-base-300 px-4 py-4 sm:px-5 sm:py-5">{footer}</div>
      ) : null}
    </section>
  );
}

export default RecordList;
