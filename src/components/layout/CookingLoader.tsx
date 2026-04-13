type CookingLoaderProps = {
  detail: string;
  kicker: string;
  reducedMotion?: boolean;
  title: string;
  visible?: boolean;
};

export function CookingLoader({
  detail,
  kicker,
  reducedMotion = false,
  title,
  visible = true
}: CookingLoaderProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`route-transition ${visible ? 'visible' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}
      role="status"
    >
      <div className="route-transition-card">
        <div className="route-transition-kicker">{kicker}</div>
        <div className="route-transition-line">
          <div className="route-transition-pan">
            <span className="route-transition-pan-body" />
            <span className="route-transition-pan-handle" />
            <span className="route-transition-pan-rim" />
            <span className="route-transition-garnish garnish-one" />
            <span className="route-transition-garnish garnish-two" />
            <span className="route-transition-garnish garnish-three" />
          </div>
          <div className="route-transition-steam">
            <span />
            <span />
            <span />
          </div>
          <div className="route-transition-burners">
            <span />
            <span />
            <span />
          </div>
        </div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
