import React from 'react';
import { PROFILE_ICONS } from '../../config/profileIcons';

interface ProfileIconSelectorProps {
  selectedIcon: number | null | undefined;
  onIconSelect: (iconId: number) => void;
}

const ProfileIconSelector: React.FC<ProfileIconSelectorProps> = ({ selectedIcon, onIconSelect }) => {
  const validSelectedId = selectedIcon && selectedIcon >= 1 && selectedIcon <= 10 ? selectedIcon : 1;

  return (
    <div className="profile-icon-selector">
      <h3>Choose Your Avatar</h3>
      <div className="icon-grid">
        {PROFILE_ICONS.map((icon) => (
          <button
            key={icon.id}
            className={`icon-option ${validSelectedId === icon.id ? 'selected' : ''}`}
            onClick={() => onIconSelect(icon.id)}
            title={icon.name}
            type="button"
          >
            <div
              className="icon-preview"
              dangerouslySetInnerHTML={{ __html: icon.svg }}
            />
            <span className="icon-label">{icon.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileIconSelector;
