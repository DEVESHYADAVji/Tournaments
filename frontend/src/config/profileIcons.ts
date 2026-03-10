// 10 Profile Icon options for users to choose from
export const PROFILE_ICONS = [
  {
    id: 1,
    name: 'Avatar 1',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FF6B6B"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 2,
    name: 'Avatar 2',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#4ECDC4"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 3,
    name: 'Avatar 3',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FFD166"/>
      <circle cx="50" cy="35" r="15" fill="#333333"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#333333"/>
    </svg>`
  },
  {
    id: 4,
    name: 'Avatar 4',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#95E1D3"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 5,
    name: 'Avatar 5',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#F38181"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 6,
    name: 'Avatar 6',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#AA96DA"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 7,
    name: 'Avatar 7',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FCBAD3"/>
      <circle cx="50" cy="35" r="15" fill="#333333"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#333333"/>
    </svg>`
  },
  {
    id: 8,
    name: 'Avatar 8',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#8FD14F"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 9,
    name: 'Avatar 9',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#6BCB77"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 10,
    name: 'Avatar 10',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#4D96FF"/>
      <circle cx="50" cy="35" r="15" fill="#FFFFFF"/>
      <ellipse cx="50" cy="70" rx="20" ry="25" fill="#FFFFFF"/>
    </svg>`
  }
];

export const getProfileIcon = (iconId: number | null | undefined): string => {
  const validId = iconId && iconId >= 1 && iconId <= 10 ? iconId : 1;
  return PROFILE_ICONS[validId - 1].svg;
};
