const DatapathLogo = ({ className = "", height = 32 }: { className?: string; height?: number }) => {
  const scale = height / 32;
  const width = Math.round(160 * scale);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield icon */}
      <path
        d="M14 3L4 7.5V15C4 22.18 8.38 28.92 14 31C19.62 28.92 24 22.18 24 15V7.5L14 3Z"
        fill="hsl(155, 100%, 32%)"
      />
      <text
        x="13.5"
        y="20"
        textAnchor="middle"
        fill="white"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontWeight="700"
        fontSize="14"
      >
        D
      </text>
      {/* DATAPATH text */}
      <text
        x="32"
        y="22"
        fill="currentColor"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontWeight="600"
        fontSize="16"
        letterSpacing="3"
      >
        DATAPATH
      </text>
    </svg>
  );
};

export default DatapathLogo;
