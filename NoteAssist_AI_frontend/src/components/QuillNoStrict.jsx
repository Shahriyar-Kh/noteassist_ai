import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';

// Mounts ReactQuill into a child root so it is not affected by the app's StrictMode
// This avoids warnings coming from ReactQuill's internal use of findDOMNode.
const QuillNoStrict = forwardRef(function QuillNoStrict(props, ref) {
  const containerRef = useRef(null);
  const rootRef = useRef(null);
  const QuillCompRef = useRef(null);
  const innerRef = useRef(null);

  useImperativeHandle(ref, () => innerRef.current, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mod = await import('react-quill');
      if (cancelled) return;
      QuillCompRef.current = mod.default;
      if (containerRef.current) {
        rootRef.current = createRoot(containerRef.current);
        rootRef.current.render(React.createElement(QuillCompRef.current, { ...props, ref: innerRef }));
      }
    })();

    return () => {
      cancelled = true;
      // Defer unmount to avoid synchronous unmount during React render
      if (rootRef.current) queueMicrotask(() => {
        try {
          rootRef.current.unmount();
        } catch (e) {
          // swallow - unmount may be unsafe during concurrent renders
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update when common props change (value, theme, modules, formats, placeholder)
  useEffect(() => {
    if (rootRef.current && QuillCompRef.current) {
      rootRef.current.render(React.createElement(QuillCompRef.current, { ...props, ref: innerRef }));
    }
  }, [props.value, props.theme, props.modules, props.formats, props.placeholder, props.className, props.style]);

  return <div ref={containerRef} />;
});

export default QuillNoStrict;
