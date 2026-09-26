import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { files } from '../lib/files';
import { categoryOf } from '../lib/file-utils';
import type { Entry } from '../lib/types';
import { colors, Icon, type IconName } from './ui';

export function FileThumbnail({ entry, location, large, fallback }: { entry: Entry; location: string; large: boolean; fallback: IconName }) {
  const [preview, setPreview] = useState<{ key: string; uri: string } | null>(null);
  const kind = categoryOf(entry);
  const key = `${location}/${entry.path}/${entry.modified}`;
  useEffect(() => {
    let active = true;
    if (kind === 'image' || kind === 'video' || kind === 'document') {
      files.thumbnail(location, entry.path).then(uri => { if (active && uri) setPreview({ key, uri }); }).catch(() => {});
    }
    return () => { active = false; };
  }, [location, entry.path, key, kind]);
  if (preview?.key === key) return <Image accessibilityIgnoresInvertColors source={{ uri: preview.uri }} style={{ width: large ? 72 : 38, height: large ? 72 : 44, borderRadius: 3 }} resizeMode="contain" />;
  return <Icon name={fallback} size={large ? 58 : 34} color={entry.isDirectory ? '#5AC8FA' : colors.muted} />;
}
