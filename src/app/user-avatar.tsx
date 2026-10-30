import Image from "next/image";

type UserAvatarProps = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  className?: string;
};

export function UserAvatar({
  username,
  displayName,
  avatarUrl,
  scale = 1,
  offsetX = 50,
  offsetY = 50,
  className = "size-10",
}: UserAvatarProps) {
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e9efe7] font-semibold text-[#315b46] ${className}`}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${displayName ?? username} profil fotoğrafı`}
          fill
          sizes="96px"
          unoptimized
          className="object-cover"
          style={{ objectPosition: `${offsetX}% ${offsetY}%`, transform: `scale(${scale})` }}
        />
      ) : (
        (displayName ?? username).slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
