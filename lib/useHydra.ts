import { useState, useCallback } from "react";
import { hydraEncrypt, hydraDecrypt, HydraShard, HydraEncryptResult } from "./hydra-crypto";

export type HydraMode = "client" | "server";

export interface UseHydraOptions {
  mode?: HydraMode;
  numShards?: number;
  onError?: (err: string) => void;
}

export function useHydra(options: UseHydraOptions = {}) {
  const { mode = "client", numShards = 3, onError } = options;
  const [encrypting, setEncrypting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (msg: string) => {
      setError(msg);
      onError?.(msg);
    },
    [onError]
  );

  const encrypt = useCallback(
    async (plaintext: string, password: string): Promise<HydraEncryptResult | null> => {
      setEncrypting(true);
      setError(null);
      try {
        let result: HydraEncryptResult;
        if (mode === "server") {
          const res = await fetch("/api/hydra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "encrypt", plaintext, password, numShards }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error);
          result = json.data;
        } else {
          result = await hydraEncrypt(plaintext, password, numShards);
        }
        setEncrypting(false);
        return result;
      } catch (err) {
        handleError(err instanceof Error ? err.message : "Encryption failed");
        setEncrypting(false);
        return null;
      }
    },
    [mode, numShards, handleError]
  );

  const decrypt = useCallback(
    async (shards: HydraShard[], password: string): Promise<string | null> => {
      setDecrypting(true);
      setError(null);
      try {
        let plaintext: string;
        if (mode === "server") {
          const res = await fetch("/api/hydra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "decrypt", shards, password }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error);
          plaintext = json.data.plaintext;
        } else {
          plaintext = (await hydraDecrypt(shards, password)).plaintext;
        }
        setDecrypting(false);
        return plaintext;
      } catch (err) {
        handleError(err instanceof Error ? err.message : "Decryption failed");
        setDecrypting(false);
        return null;
      }
    },
    [mode, handleError]
  );

  const reset = useCallback(() => setError(null), []);

  return { encrypt, decrypt, encrypting, decrypting, error, reset };
}
