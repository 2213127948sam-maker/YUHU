import { useState } from 'react';
export function EntityIcon({ icon, name, cost }: { icon?: string; name: string; cost?: number }) {
  const [failed, setFailed] = useState(false);
  return <span className={`entity-icon cost-${cost ?? 0}`} aria-hidden="true">
    {icon && !failed ? <img src={icon} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{name.slice(0, 1)}</span>}
    {cost && <em>{cost}</em>}
  </span>;
}
