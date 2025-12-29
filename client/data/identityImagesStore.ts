import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type IdentityImage = {
  uri?: string | null;
};

const KEY_PREFIX = "familysync:identity-image:";

async function load(key: string): Promise<IdentityImage | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + key);
    return raw ? (JSON.parse(raw) as IdentityImage) : null;
  } catch {
    return null;
  }
}

async function save(key: string, value: IdentityImage) {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // swallow – local-only best effort
  }
}

export function useIdentityImage(id: string) {
  const [image, setImage] = useState<IdentityImage | null>(null);

  useEffect(() => {
    let mounted = true;
    load(id).then((v) => mounted && setImage(v));
    return () => {
      mounted = false;
    };
  }, [id]);

  const setUri = async (uri: string | null) => {
    const next = { uri };
    setImage(next);
    await save(id, next);
  };

  // Back-compat: screens call image.set(uri)
  const set = setUri;

  return {
    image,
    uri: image?.uri ?? null,
    setUri,
    set,
  };
}
