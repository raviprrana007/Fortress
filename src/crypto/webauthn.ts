/**
 * WebAuthn biometric authentication module.
 */

const RP_ID = window.location.hostname;
const RP_NAME = 'Fortress Password Manager';
const CHALLENGE_LENGTH = 32;

function generateChallenge(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(CHALLENGE_LENGTH)).buffer as ArrayBuffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

export function isWebAuthnSupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function registerBiometric(userId: string, userName: string): Promise<{
  credentialId: string;
  publicKey: string;
}> {
  if (!isWebAuthnSupported()) throw new Error('WebAuthn not supported');

  const challenge = generateChallenge();
  const userIdBytes = new TextEncoder().encode(userId);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: RP_ID, name: RP_NAME },
      user: {
        id: userIdBytes.buffer as ArrayBuffer,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  }) as PublicKeyCredential;

  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = bufferToBase64Url(credential.rawId);
  const publicKey = bufferToBase64Url(response.getPublicKey() || new ArrayBuffer(0));

  return { credentialId, publicKey };
}

export async function authenticateBiometric(credentialId: string): Promise<boolean> {
  if (!isWebAuthnSupported()) throw new Error('WebAuthn not supported');

  const challenge = generateChallenge();
  const allowedCredentials: PublicKeyCredentialDescriptor[] = credentialId
    ? [{ id: base64UrlToBuffer(credentialId), type: 'public-key' }]
    : [];

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: RP_ID,
        allowCredentials: allowedCredentials,
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!credential;
  } catch (err) {
    if ((err as Error).name === 'NotAllowedError') return false;
    throw err;
  }
}
