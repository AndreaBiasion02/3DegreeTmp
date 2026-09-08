export default function ResponsiveImage({
  src,
  alt,
  width = 465,
  height = 355,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const src2x = src.replace(/\.webp$/, "@2x.webp");
  return (
    <img
      src={src}
      srcSet={`${src} 1x, ${src2x} 2x`}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      className={className}
    />
  );
}
