export default function ResponsiveImage({
  src,
  alt,
  width = 930,
  height = 710,
  priority = false,
  className = "",
  sizes,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const src2x = src.replace(/\.webp$/, "@2x.webp");
  const src4x = src.includes("-facolta.webp") || src.includes("/sottobicchiere-") ? src.replace(/\.webp$/, "@4x.webp") : null;
  return (
    <img
      src={src}
      srcSet={`${src} 465w, ${src2x} 930w${src4x ? `, ${src4x} 1860w` : ""}`}
      sizes={sizes ?? (priority ? "(min-width: 1536px) 720px, (min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 465px, (min-width: 640px) 50vw, 100vw")}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      className={className}
    />
  );
}
