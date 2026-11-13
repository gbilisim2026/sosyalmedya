import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  imageSize?: number;
};

export function BrandLogo({ className = "", imageSize = 52 }: BrandLogoProps) {
  return (
    <Link href="/" aria-label="Gültepe Sosyal ana sayfa" className={`brand-logo ${className}`}>
      <Image
        src="/gultepe-sosyal-logo.jpg"
        alt=""
        width={imageSize}
        height={imageSize}
        className="brand-logo-image"
        priority
      />
      <span className="brand-logo-name">
        <span className="brand-logo-primary">Gültepe</span>
        <span className="brand-logo-secondary">Sosyal</span>
      </span>
    </Link>
  );
}
