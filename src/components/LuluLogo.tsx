type LuluLogoProps = {
  size?: number;
  showWordmark?: boolean;
};

export const LuluLogo = ({ size = 32, showWordmark = true }: LuluLogoProps) => (
  <span className="lulu-logo" role="img" aria-label="LuluTales">
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="24" cy="24" r="24" />
      <path d="M14.5 20.5q3-3.6 6 0" fill="none" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M27.5 20.5q3-3.6 6 0" fill="none" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M18 25.5v2.5a6 6 0 0 0 12 0v-2.5" fill="none" strokeWidth="3" strokeLinecap="round" />
    </svg>
    {showWordmark && <span className="lulu-wordmark">Lulu<span>Tales</span></span>}
  </span>
);

export default LuluLogo;