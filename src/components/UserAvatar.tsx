import { AVATAR_PRESETS, type Profile } from '../lib/auth'

export function UserAvatar({ profile, size = 42 }: { profile: Pick<Profile, 'username' | 'avatar_type' | 'avatar_value'>; size?: number }) {
  const preset = AVATAR_PRESETS.find((item) => item.id === profile.avatar_value) ?? AVATAR_PRESETS[0]
  return (
    <span
      className="user-avatar"
      style={{ width: size, height: size, fontSize: size * .48, background: profile.avatar_type === 'preset' ? preset.color : undefined }}
      aria-label={`Avatar de ${profile.username}`}
    >
      {profile.avatar_type === 'upload'
        ? <img src={profile.avatar_value} alt="" />
        : <span aria-hidden>{preset.emoji}</span>}
    </span>
  )
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="avatar-picker" role="radiogroup" aria-label="Escolha um avatar">
      {AVATAR_PRESETS.map((preset) => (
        <button
          type="button"
          key={preset.id}
          className={value === preset.id ? 'is-selected' : ''}
          style={{ background: preset.color }}
          role="radio"
          aria-checked={value === preset.id}
          aria-label={preset.id}
          onClick={() => onChange(preset.id)}
        >
          <span aria-hidden>{preset.emoji}</span>
        </button>
      ))}
    </div>
  )
}
