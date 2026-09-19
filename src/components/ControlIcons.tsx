type IconProps = { size?: number }

export function PlusIcon({ size = 18 }: IconProps) {
  return <svg className="control-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
}

export function CloseIcon({ size = 18 }: IconProps) {
  return <svg className="control-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="m6.5 6.5 11 11m0-11-11 11" /></svg>
}

export function MoreIcon({ size = 18 }: IconProps) {
  return <svg className="control-icon is-filled" width={size} height={size} viewBox="0 0 24 24" aria-hidden><circle cx="5" cy="12" r="1.45"/><circle cx="12" cy="12" r="1.45"/><circle cx="19" cy="12" r="1.45"/></svg>
}

export function ChevronRightIcon({ size = 18 }: IconProps) {
  return <svg className="control-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="m9 5 7 7-7 7" /></svg>
}
