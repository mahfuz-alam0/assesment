const ITERATIONS = 100_000; // Workers WebCrypto caps PBKDF2 at 100k

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(encoded: string) {
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}

async function derive(password: string, salt: BufferSource, iterations: number) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    passwordKey,
    256,
  );
  return new Uint8Array(bits);
}

// format: pbkdf2$<iterations>$<saltB64>$<hashB64>
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, iterations, salt, hash] = stored.split("$");
  const expected = fromBase64(hash);
  const actual = await derive(password, fromBase64(salt), Number(iterations));

  // constant-time compare: no early exit
  let difference = expected.length ^ actual.length;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual[index] ^ (expected[index] ?? 0);
  }
  return difference === 0;
}
