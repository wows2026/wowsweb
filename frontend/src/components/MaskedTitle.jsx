import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function MaskedTitle({ children, className = "", testid }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  return (
    <div ref={ref} className="overflow-hidden">
      <motion.h2
        initial={{ y: "110%" }}
        animate={{ y: inView ? "0%" : "110%" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={className}
        data-testid={testid}
      >
        {children}
      </motion.h2>
    </div>
  );
}
