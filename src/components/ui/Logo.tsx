interface LogoProps {
  /** pixel size of the ribbon mark (square). */
  size?: number;
  /** append a muted "Analytics" descriptor after the wordmark. */
  analytics?: boolean;
  className?: string;
}

/**
 * Community brand lockup: the official two-ribbon mark + "Community" wordmark,
 * matching the lockup used in Community's own dashboard. The mark is the real
 * Community.com logo (inherits color via currentColor). The wordmark is set in
 * the app's grotesk; swap in Community's exact brand font file if you have it.
 */
export default function Logo({ size = 24, analytics = false, className }: LogoProps): JSX.Element {
  return (
    <div className={'flex items-center gap-2 ' + (className ?? '')}>
      <svg
        viewBox="0 0 147 147"
        width={size}
        height={size}
        className="shrink-0 text-ink"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M3.99215 128.554C18.6379 105.868 34.9701 95.2413 60.5927 101.606C76.1754 105.472 91.4424 110.997 110.27 110.997C132.796 110.997 143.388 106.632 146.218 105.217C146.721 104.972 147.027 104.491 147.027 103.944V64.248C147.027 63.5597 146.258 63.0788 145.607 63.39C142.007 65.0401 131.375 68.8777 110.27 68.8777C82.0632 68.8777 61.8748 56.2051 36.4889 56.2051C14.9691 56.2051 3.74559 61.1459 0.816448 62.6357C0.313464 62.8903 0.0274527 63.3711 0.0274527 63.9086V128.441C0.00772784 129.912 2.67059 130.591 3.99215 128.554Z"
          fill="currentColor"
        />
        <path
          d="M146.99 48.0514C146.99 48.5888 146.684 49.0697 146.201 49.3054C143.36 50.7198 132.758 55.0854 110.252 55.0854C82.0456 55.0854 61.8572 42.4222 36.4516 42.4222C16.3223 42.4222 5.18764 46.7407 1.43992 48.5322C0.76927 48.8434 0 48.3908 0 47.6931V7.9874C0 7.45937 0.286011 6.97849 0.788995 6.73333C3.70828 5.21526 14.9515 0.302734 36.4516 0.302734C61.8572 0.302734 82.0358 12.9659 110.252 12.9659C131.358 12.9659 141.99 9.12831 145.57 7.49709C146.23 7.18593 146.99 7.64795 146.99 8.33627V48.0514Z"
          fill="currentColor"
        />
      </svg>
      <span className="text-19 font-bold leading-none tracking-[-0.02em] text-ink">
        Community
      </span>
      {analytics && (
        <span className="text-19 font-normal leading-none tracking-[-0.01em] text-text-muted">
          Analytics
        </span>
      )}
    </div>
  );
}
