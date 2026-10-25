export interface AppDeepLink {
  name: string;
  scheme: string;
  color: string;
  badge: string;
}

export function getAppDeepLinks(subUrl: string): AppDeepLink[] {
  const encSub = encodeURIComponent(subUrl);

  return [
    {
      name: 'v2rayNG',
      scheme: `v2rayng://install-config?url=${encSub}`,
      color: '#34A853',
      badge: 'Android',
    },
    {
      name: 'Hiddify',
      scheme: `hiddify://install-sub?url=${encSub}#wegov2ray`,
      color: '#4285F4',
      badge: 'All Platforms',
    },
    {
      name: 'Streisand',
      scheme: `streisand://import/${subUrl}`,
      color: '#EA4335',
      badge: 'iOS',
    },
    {
      name: 'V2Box',
      scheme: `v2box://install-sub?url=${encSub}&name=wegov2ray`,
      color: '#FBBC05',
      badge: 'iOS / Android',
    },
  ];
}
