import { useEffect } from 'react';

import { Assets, ElementType, LoadingStatus } from 'common/types';
import { useRefState } from 'hooks/useRefState';

export function useAssets({
  densityFactor,
  draw,
}: {
  densityFactor: number;
  draw: () => void;
}): Assets {
  const assets = useRefState<Assets>({
    x1: { images: {}, status: LoadingStatus.NONE },
    x2: { images: {}, status: LoadingStatus.NONE },
  });

  useEffect(() => {
    const is2x = densityFactor > 1.5;

    const assetsSet = assets[is2x ? 'x1' : 'x2'];

    if (assetsSet.status !== LoadingStatus.NONE) {
      return;
    }

    const loadImages = [
      ElementType.PNP,
      ElementType.NPN,
      ElementType.POWER,
      ElementType.GROUND,
    ];

    let remainLoad = loadImages.length;

    function onLoad() {
      remainLoad -= 1;

      if (remainLoad === 0) {
        assetsSet.status = LoadingStatus.DONE;
        draw();
      }
    }

    assetsSet.status = LoadingStatus.LOADING;

    for (const imgName of loadImages) {
      const image = new Image();
      image.src = `assets/${imgName}${is2x ? '@2x' : ''}.png`;
      image.addEventListener('load', () => {
        assetsSet.images[imgName] = image;
        onLoad();
      });
      image.addEventListener('error', onLoad);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [densityFactor]);

  return assets;
}
