declare module 'jsonwebtoken' {
  export type SignOptions = {
    expiresIn?: string | number;
    subject?: string;
  };

  const jwt: {
    sign(payload: object, secretOrPrivateKey: string, options?: SignOptions): string;
    verify(token: string, secretOrPublicKey: string): string | { [key: string]: unknown; sub?: string };
  };

  export default jwt;
}
